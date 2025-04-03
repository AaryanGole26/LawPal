from flask import Flask, request, jsonify
from flask_cors import CORS
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from groq import Groq
from typing import List, Dict
import os
import dotenv

app = Flask(__name__)
CORS(app)

dotenv.load_dotenv()

# Initialize Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API")
PINECONE_ENV = os.getenv("PINECONE_ENV")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Initialize Sentence Transformer Model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize Groq
GROQ_API_KEY = os.getenv("GROQ_API")    
groq_client = Groq(api_key=GROQ_API_KEY)

# Store conversation history (in-memory, for simplicity)
conversation_histories = {
    "education": {},
    "employment": {},
    "healthcare": {},
    "housing": {},
    "pension": {},
    "tax": {}
}

# Function to retrieve relevant chunks from Pinecone
def retrieve_context(index_name: str, query: str, top_k: int = 3) -> List[Dict]:
    index = pc.Index(index_name)
    query_embedding = model.encode(query).tolist()
    results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
    contexts = [match["metadata"]["text"] for match in results["matches"]]
    return contexts

# Function to generate response using Groq
def generate_response(query: str, contexts: List[str], history: List[Dict], service: str) -> str:
    context_str = "\n\n".join(contexts)
    
    # Format conversation history
    history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    
    prompt = f"""
    You are a helpful chatbot working for the Indian Government’s {service.capitalize()} Services. Use the provided context and conversation history to answer the user’s query as accurately and concisely as possible. If the context does not fully address the query, supplement it with your general knowledge to provide a complete and up-to-date answer, reflecting information available as of March 14, 2025. Ensure responses are tailored to Indian {service} services and schemes, and avoid extraneous details. If the query involves calculations, provide step-by-step explanations. Do not include any text beyond the answer itself unless explicitly instructed otherwise.

    Conversation History:
    {history_str}

    Context:
    {context_str}

    Query:
    {query}

    Answer:
    """
    
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile", 
        messages=[
            {"role": "system", "content": "You are a helpful government assistant."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,  
        temperature=0.7
    )
    
    return response.choices[0].message.content.strip()

# Flask endpoint to handle chatbot queries for education
@app.route('/education/chat', methods=['POST'])
def education_chat():
    return handle_chat("education")

# Flask endpoint to handle chatbot queries for employment
@app.route('/employment/chat', methods=['POST'])
def employment_chat():
    return handle_chat("employment")

# Flask endpoint to handle chatbot queries for healthcare
@app.route('/healthcare/chat', methods=['POST'])
def healthcare_chat():
    return handle_chat("healthcare")

# Flask endpoint to handle chatbot queries for housing
@app.route('/housing/chat', methods=['POST'])
def housing_chat():
    return handle_chat("housing")

# Flask endpoint to handle chatbot queries for pension
@app.route('/pension/chat', methods=['POST'])
def pension_chat():
    return handle_chat("pension")

# Flask endpoint to handle chatbot queries for tax
@app.route('/tax/chat', methods=['POST'])
def tax_chat():
    return handle_chat("tax")

# Common function to handle chat requests
def handle_chat(service: str):
    data = request.json
    query = data.get('query')
    user_id = data.get('user_id', 'default_user')  # Use a unique user ID for each session
    
    if not query:
        return jsonify({"error": "No query provided"}), 400
    
    # Retrieve or initialize conversation history for the user
    if user_id not in conversation_histories[service]:
        conversation_histories[service][user_id] = []
    
    # Retrieve context from Pinecone
    contexts = retrieve_context(service, query)
    if not contexts:
        return jsonify({"response": "Sorry, I couldn't find any relevant information."})
    
    try:
        # Generate response using conversation history
        response = generate_response(query, contexts, conversation_histories[service][user_id], service)
        
        # Update conversation history
        conversation_histories[service][user_id].append({"role": "user", "content": query})
        conversation_histories[service][user_id].append({"role": "bot", "content": response})
        
        # Limit history length to avoid exceeding token limits
        if len(conversation_histories[service][user_id]) > 10:  # Keep last 10 exchanges
            conversation_histories[service][user_id] = conversation_histories[service][user_id][-10:]
        
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000)