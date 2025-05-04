import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);

  // Base URL for API - use environment variable if available or default
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:89';

  // Fetch detection history on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Fetch detection history from backend
  const fetchHistory = async () => {
    try {
      console.log('Fetching history from:', `${API_BASE_URL}/api/detections`);
      const response = await fetch(`${API_BASE_URL}/api/detections`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('History data received:', data);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(`Failed to load detection history: ${err.message}`);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log('File selected:', selectedFile.name);
      setFile(selectedFile);
      
      // Create preview URL for image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      
      // Reset previous results
      setDetectionResult(null);
      setError(null);
    }
  };

  // Handle file upload and face detection
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an image file first.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      console.log('Uploading file:', file.name);
      const formData = new FormData();
      formData.append('image', file);
      
      // Send to backend service
      console.log('Sending to:', `${API_BASE_URL}/api/detect`);
      const response = await fetch(`${API_BASE_URL}/api/detect`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Detection result:', result);
      
      // Use local preview for image display
      setDetectionResult({
        ...result,
        resultImageUrl: preview
      });
      
      // Refresh history after successful upload
      fetchHistory();
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(`Failed to process image: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle image load to get actual dimensions
  const handleImageLoad = (e) => {
    const img = e.target;
    
    // Store the actual displayed dimensions
    const rect = img.getBoundingClientRect();
    
    console.log("Image natural dimensions:", img.naturalWidth, "x", img.naturalHeight);
    console.log("Image displayed dimensions:", rect.width, "x", rect.height);
    
    setImageSize({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: rect.width,
      displayHeight: rect.height
    });
  };

  // Calculate scaled position for face rectangle
  const getScaledRect = (rect) => {
    if (!rect || !imageSize.naturalWidth || !imageSize.displayWidth) return null;
    
    // Calculate the scale ratio between the natural image and how it's displayed
    const scaleX = imageSize.displayWidth / imageSize.naturalWidth;
    const scaleY = imageSize.displayHeight / imageSize.naturalHeight;
    
    // Apply the scaling directly to the face rectangle coordinates
    return {
      left: Math.round(rect.left * scaleX),
      top: Math.round(rect.top * scaleY),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY)
    };
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Render detection result with faces highlighted
  const renderDetectionResult = () => {
    if (!detectionResult) return null;
  
  return (
    <div className="detection-result">
      <h3>Detection Results</h3>
      <div className="result-image-container">
        <img 
          ref={imageRef}
          src={preview} 
          alt="Detection result" 
          className="result-image" 
          onLoad={handleImageLoad}
        />
        {detectionResult.faces && imageSize.displayWidth > 0 && detectionResult.faces.map((face, index) => {
          // Extract face rectangle from the result
          const rect = face.faceRectangle || { left: 0, top: 0, width: 0, height: 0 };
          
          // Calculate the scaled rectangle
          const scaledRect = getScaledRect(rect);
          
          // If scaling failed, don't render this rectangle
          if (!scaledRect) return null;
          
          console.log(`Face #${index + 1}:`);
          console.log(`  Original: left=${rect.left}, top=${rect.top}, width=${rect.width}, height=${rect.height}`);
          console.log(`  Scaled: left=${scaledRect.left}, top=${scaledRect.top}, width=${scaledRect.width}, height=${scaledRect.height}`);
          
          return (
            <div 
              key={index}
              className="face-rectangle"
              style={{
                left: `${scaledRect.left}px`,
                top: `${scaledRect.top}px`,
                width: `${scaledRect.width}px`,
                height: `${scaledRect.height}px`,
                border: '3px solid red',
                position: 'absolute',
                boxSizing: 'border-box'
              }}
            />
          );
        })}
      </div>
        <div className="detection-details">
          <p><strong>Detected faces:</strong> {detectionResult.faces ? detectionResult.faces.length : 0}</p>
          {detectionResult.faces && detectionResult.faces.map((face, index) => (
            <div key={index} className="face-details">
              <p><strong>Face #{index + 1}</strong></p>
              <p>Emotion: {
                face.faceAttributes?.emotion ? 
                Object.entries(face.faceAttributes.emotion)
                  .sort((a, b) => b[1] - a[1])[0][0] : 
                'Unknown'
              }</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="ai-container">
      <h2>Azure Face Detection</h2>
      
      <div className="upload-section">
        <form onSubmit={handleUpload}>
          <div className="file-input-container">
            <input 
              type="file" 
              onChange={handleFileChange} 
              accept="image/*"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="file-input-label">
              Choose Image
            </label>
            <span className="file-name">{file ? file.name : 'No file selected'}</span>
          </div>
          
          {preview && (
            <div className="image-preview-container">
              <img src={preview} alt="Preview" className="image-preview" />
            </div>
          )}
          
          <button 
            type="submit" 
            className="upload-button"
            disabled={uploading || !file}
          >
            {uploading ? 'Processing...' : 'Detect Faces'}
          </button>
        </form>
        
        {error && <div className="error-message">{error}</div>}
      </div>
      
      {detectionResult && renderDetectionResult()}
      
      <div className="history-section">
        <h3>Detection History</h3>
        {history.length === 0 ? (
          <p>No previous detections found.</p>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id || item.fileName} className="history-item">
                <div className="history-item-header">
                  <span className="history-item-name">{item.fileName}</span>
                  <span className="history-item-time">{formatTimestamp(item.timestamp)}</span>
                </div>
                <div className="history-item-detail">
                  <p>Faces detected: {item.facesDetected}</p>
                  <span className="view-info">Saved in Azure</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;