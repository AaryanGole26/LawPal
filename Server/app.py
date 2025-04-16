from pinecone import Pinecone
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from groq import Groq
from tqdm import tqdm
import os
import dotenv
import fitz  # PyMuPDF for PDF text extraction
from textwrap import wrap
from supabase import create_client, Client
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-ID"],
    }
})

dotenv.load_dotenv()

# Initialize Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API")
PINECONE_ENV = os.getenv("PINECONE_ENV", "us-east-1")
if not PINECONE_API_KEY:
    raise ValueError("Missing Pinecone API Key.")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Initialize Sentence Transformer Model
model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

# Initialize Groq
GROQ_API_KEY = os.getenv("GROQ_API")
if not GROQ_API_KEY:
    raise ValueError("Missing Groq API Key.")
groq_client = Groq(api_key=GROQ_API_KEY)

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase URL or Key.")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Store conversation history
conversation_histories = {
    "personal-and-family-legal-assistance": {},
    "business-consumer-and-criminal-legal-assistance": {},
    "consultation": {},
}

@app.route('/submit-form', methods=['POST'])
def submit_form():
    try:
        # Log the incoming request data
        logger.debug("Received form data: %s", request.get_data())

        # Check if request has JSON data
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        logger.debug("Parsed JSON data: %s", data)

        # Validate required fields
        required_fields = ["firstName", "lastName", "email", "subject", "message"]
        if not all(field in data and data[field] for field in required_fields):
            return jsonify({"error": "Missing or empty required fields"}), 400

        # Insert data into Supabase
        response = supabase.table("user_forms").insert(data).execute()
        logger.debug("Supabase response: %s", response)

        if response.status_code == 201:
            return jsonify({"message": "Form submitted successfully!"}), 201
        else:
            return jsonify({"error": response.get("message", "Failed to store data in Supabase")}), 500

    except Exception as e:
        logger.error("Error in submit_form: %s", str(e), exc_info=True)
        # Check if the table exists and create it if it doesn't
        try:
            # This is a basic check; adjust schema as needed
            supabase.table("user_forms").select("*").limit(1).execute()
        except Exception as table_error:
            logger.error("Table 'user_forms' issue: %s", str(table_error), exc_info=True)
            return jsonify({"error": "Database table 'user_forms' not found or misconfigured. Contact administrator."}), 500
        return jsonify({"error": str(e)}), 500

# Function to extract text from PDFs in Supabase bucket
def extract_text_from_pdfs(bucket_name: str):
    all_texts = []
    chunk_size = 1000
    try:
        files = supabase.storage.from_(bucket_name).list()
        if not files or not isinstance(files, list) or len(files) == 0:
            print(f"No files found in bucket: {bucket_name}")
            return all_texts
    except Exception as e:
        print(f"Error listing files in Supabase bucket {bucket_name}: {e}")
        return all_texts

    for file in tqdm(files, desc="Processing PDFs from Supabase"):
        if file["name"].endswith(".pdf"):
            try:
                pdf_data = supabase.storage.from_(bucket_name).download(file["name"])
                doc = fitz.open("pdf", pdf_data)
                text_chunks = []
                for page in doc:
                    page_text = page.get_text("text")
                    if not page_text.strip():
                        page_dict = page.get_text("dict")
                        page_text = " ".join(block["text"] for block in page_dict.get("blocks", []) if block.get("type") == 0)
                    if not page_text.strip():
                        page_dict = page.get_text("rawdict")
                        page_text = " ".join(block["text"] for block in page_dict.get("blocks", []) if block.get("type") == 0)
                    if not page_text.strip():
                        continue
                    chunks = wrap(page_text, chunk_size)
                    text_chunks.extend(chunks)
                for i, chunk in enumerate(text_chunks):
                    if chunk.strip():
                        all_texts.append({"filename": f"{file['name']}_chunk_{i}", "text": chunk})
            except Exception as e:
                print(f"Error processing {file['name']}: {e}")
    return all_texts

# Function to create Pinecone index
def create_pinecone_index(bucket_name: str):
    index_name = "lawpal"
    existing_indexes = pc.list_indexes().names()
    if index_name not in existing_indexes:
        dimension = 384
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric="cosine",
            spec={"serverless": {"cloud": "aws", "region": PINECONE_ENV}}
        )
        print("✅ Index created successfully!")
    index = pc.Index(index_name)
    existing_vector_count = index.describe_index_stats()["total_vector_count"]
    if existing_vector_count > 0:
        print(f"ℹ️ Pinecone already has {existing_vector_count} vectors. Skipping processing.")
        return
    docs = extract_text_from_pdfs(bucket_name)
    if not docs:
        print("Error: No documents extracted from Supabase bucket.")
        return
    batch_size = 32
    vectors = []
    texts = [doc["text"] for doc in docs]
    filenames = [doc["filename"] for doc in docs]
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        embeddings = model.encode(batch_texts, batch_size=batch_size, show_progress_bar=True)
        for j, embedding in enumerate(embeddings):
            vectors.append((filenames[i + j], embedding.tolist(), {"text": batch_texts[j]}))
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)

# Function to retrieve relevant chunks from Pinecone
def retrieve_context(index_name: str, query: str, top_k: int = 3):
    index = pc.Index(index_name)
    query_embedding = model.encode(query).tolist()
    try:
        results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
        return [match["metadata"]["text"] for match in results["matches"] if "metadata" in match]
    except Exception as e:
        print(f"Error retrieving from Pinecone: {e}")
        return []

# Function to generate response using Groq
def generate_response(query: str, contexts: list, history: list, service: str):
    context_str = "\n\n".join(contexts) if contexts else "No specific information found."
    history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    prompt = f"""
You are a sophisticated AI legal assistant specializing in Indian {service.replace('-', ' ').title()} Services. Your objective is to provide precise, judicially relevant responses strictly within the scope of Indian law and applicable regulations.

Ensure 100% clarity on the user’s query using available context and conversation history.

Respond strictly within the framework of Indian {service.replace('-', ' ').title()} laws, rules, and judicial precedents. If insufficient context is available, refer only to verified Indian government laws, schemes, or notifications.

Avoid speculation or general knowledge. Do not provide personal opinions or unverified interpretations under any circumstance.

For queries involving complex legal analysis or calculations:

Proceed only if supported by explicit legal context.

Provide a step-by-step, statute-based explanation.

Clearly state when the matter requires consultation with a licensed Indian legal professional.

Maintain a professional, factual, and concise tone. Do not use informal language, emotions, or filler content.

Exclude all irrelevant or out-of-context details.

Your sole objective is to deliver clear, compliant, and legally sound information related to Indian {service.replace('-', ' ').title()} Services.

Conversation History:
{history_str}

Context:
{context_str}

Query:
{query}

Answer:
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful government assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=700,
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating response: {e}")
        return "I'm sorry, but I encountered an issue generating a response."

# Common function to handle chat requests
def handle_chat(service: str):
    data = request.json
    query = data.get('query')
    user_id = data.get('user_id', 'default_user')
    if not query:
        return jsonify({"error": "No query provided"}), 400
    history = conversation_histories[service].setdefault(user_id, [])
    contexts = retrieve_context("lawpal", query)
    try:
        response = generate_response(query, contexts, history, service)
        history.append({"role": "user", "content": query})
        history.append({"role": "bot", "content": response})
        if len(history) > 15:
            conversation_histories[service][user_id] = history[-15:]
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route for fetching chat history
@app.route('/<service>/history', methods=['GET', 'OPTIONS'])
def get_chat_history(service):
    if request.method == 'OPTIONS':
        response = jsonify({"message": "CORS preflight successful"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, X-User-ID")
        return response, 200
    if service not in conversation_histories:
        return jsonify({"error": "Invalid service category"}), 400
    user_id = request.headers.get('X-User-ID', 'default_user')
    history = conversation_histories[service].get(user_id, [])
    return jsonify({"history": history}), 200

# Route for chatbot queries
@app.route('/<service>/chat', methods=['POST', 'OPTIONS'])
def chat_service(service):
    if request.method == 'OPTIONS':
        response = jsonify({"message": "CORS preflight successful"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, X-User-ID")
        return response, 200
    if service not in conversation_histories:
        return jsonify({"error": "Invalid service category"}), 400
    return handle_chat(service)

if __name__ == "__main__":
    BUCKET_NAME = "pdfs"
    create_pinecone_index(BUCKET_NAME)
    app.run(port=5000)
