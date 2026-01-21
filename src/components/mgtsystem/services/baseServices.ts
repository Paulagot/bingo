// src/components/mgtsystem/services/BaseServices.ts
// Base service class with shared functionality for all API services

const API_BASE_URL = import.meta.env.PROD
  ? "/api"
  : "http://localhost:3001/api";


class BaseService {
  protected baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get authentication headers
   */
  protected getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  /**
   * Make authenticated API request
   */
  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    console.log('🔑 Headers:', config.headers);
    if (options.body) {
      console.log('📦 Body:', options.body);
    }

    try {
      const response = await fetch(url, config);
      
      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        
        // ✅ FIXED: Create error and preserve ALL properties from backend
        const error = new Error(
          errorData.message || errorData.error || `HTTP error! status: ${response.status}`
        ) as any;
        
        // Copy ALL backend error properties to the error object
        Object.keys(errorData).forEach(key => {
          if (key !== 'error' && key !== 'message') {
            error[key] = errorData[key];
          }
        });
        
        throw error;
      }

      const data = await response.json();
      console.log('✅ API Response Data:', data);
      return data;
    } catch (error) {
      console.error(`💥 API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Handle file uploads
   */
  protected async uploadFile(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<any> {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
        // Don't set Content-Type for FormData, browser will set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Download file from API
   */
  protected async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Batch requests with concurrent limit
   */
  protected async batchRequest<T>(
    requests: Array<() => Promise<T>>, 
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Retry failed requests
   */
  protected async retryRequest<T>(
    requestFn: () => Promise<T>, 
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        console.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying...`, error);
        await this.delay(delay * attempt);
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if user is authenticated
   */
  protected isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Clear authentication
   */
  protected clearAuth(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * Set authentication token
   */
  protected setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Build query string from object
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    
    return searchParams.toString();
  }

  /**
   * Utility: Format currency
   */
  protected formatCurrency(amount: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency
    }).format(amount);
  }

  /**
   * Utility: Format date
   */
  protected formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return new Date(date).toLocaleDateString('en-GB', options || defaultOptions);
  }

  /**
   * Utility: Validate email
   */
  protected isValidEmail(email: string): boolean {
    return /\S+@\S+\.\S+/.test(email);
  }

  /**
   * Utility: Validate phone number (UK format)
   */
  protected isValidPhone(phone: string): boolean {
    return /^[\+]?[0-9\s\-\(\)]{10,}$/.test(phone);
  }

  /**
   * Utility: Sanitize input
   */
  protected sanitizeInput(input: string): string {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * Utility: Deep clone object
   */
  protected deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Utility: Debounce function calls
   */
  protected debounce<T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Error handling helper
   */
  protected handleError(error: any, context: string): never {
    console.error(`Error in ${context}:`, error);
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      this.clearAuth();
      window.location.href = '/login';
    }
    
    throw error;
  }
}

export default BaseService;