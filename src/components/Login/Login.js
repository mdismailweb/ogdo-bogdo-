import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loginUser, handleAPIError } from '../../services/appScriptAPI';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '', // This will be the Name from the sheet
    password: '', // This will be the Employee ID from the sheet
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();


  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      const response = await loginUser(credentials);
      
      if (response.success && response.data) {
        login(response.data, response.data.role);
      } else {
        // Set an error message from the API response
        setError(response.message || 'An unknown error occurred.');
      }
    } catch (apiError) {
      console.error('Login API call failed:', apiError);
      setError(handleAPIError(apiError));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="row w-100">
        <div className="col-12 col-sm-8 col-md-6 col-lg-4 mx-auto">
          <div className="card shadow">
            <div className="card-body p-4">
              <h2 className="card-title text-center mb-4">Staff Portal Login</h2>
              
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setError('')}
                    aria-label="Close"
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">
                    Username (Full Name) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange}
                    required
                    autoFocus
                    disabled={loading}
                    style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password (Employee ID) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  />
                </div>
                
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span 
                        className="spinner-border spinner-border-sm me-2" 
                        role="status" 
                        aria-hidden="true"
                      ></span>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Login;
