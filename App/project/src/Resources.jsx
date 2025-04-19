import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { FiFile } from "react-icons/fi"; // imported document icon
import "./Resources.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Resources = () => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  // State for the Google search query.
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPdfs = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("pdfs")
          .list("", { limit: 100 });
        if (error) {
          console.error("Error fetching PDFs:", error.message);
          return;
        }
        const pdfFiles = data.filter((file) => file.name.endsWith(".pdf"));
        const pdfUrls = pdfFiles.map((file) => {
          const { data: urlData, error: urlError } = supabase.storage
            .from("pdfs")
            .getPublicUrl(file.name);
          if (urlError) {
            console.error("Error getting public URL:", urlError.message);
            return null;
          }
          return { name: file.name, url: urlData.publicUrl };
        });
        const validPdfs = pdfUrls.filter(Boolean);
        console.log("Fetched PDFs:", validPdfs);
        setPdfs(validPdfs);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPdfs();
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

// Inside Resources.jsx

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
        // Append search operators to restrict results:
        //   intitle:"judicial" OR intitle:"legal" ensures the title contains legal keywords
        //   loc:in restricts results to India
        const restrictedOperators = ' (intitle:"judicial" OR intitle:"legal") loc:in';
        const restrictedQuery = `${searchQuery}${restrictedOperators}`;
        const googleQuery = `https://www.google.com/search?q=${encodeURIComponent(restrictedQuery)}`;
        window.open(googleQuery, "_blank");
        }
    };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (pdfs.length === 0) {
    return <div className="no-resources">No PDFs available</div>;
  }

  return (
    <div className="resources-container">
      <h1 className="resources-title">Resources</h1>
      
      {/* Google Search Bar */}
      <form className="google-search-form" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search for legal documents..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="google-search-input"
        />
        <button type="submit" className="google-search-button">
          Search
        </button>
      </form>

      <ul className="resources-list">
        {pdfs.map((pdf, index) => (
          <li key={index} className="resource-item">
            <a
              href={pdf.url}
              target="_blank"
              rel="noopener noreferrer"
              className="resource-link"
            >
              <div className="pdf-preview">
                <FiFile className="document-icon" />
              </div>
              <span className="resource-name">{pdf.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Resources;
