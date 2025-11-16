// Custom Role Service for handling API calls to custom role endpoints
import axios from '../config/index';

class CustomRoleService {
  constructor() {
    this.baseURL = '/api/workers/custom-roles';
  }

  // Get all custom roles for a company
  async getCustomRoles(companyId) {
    try {
      const response = await axios.get(`${this.baseURL}/${companyId}`);
      return response.data;
    } catch (error) {
      // Gracefully handle auth/permission issues by returning empty list
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        // Not authorized or no token; return empty roles without throwing
        return [];
      }
      // For other errors (network/server), rethrow to surface genuine problems
      throw error;
    }
  }

  // Create a new custom role
  async createCustomRole(roleData) {
    try {
      const response = await axios.post(this.baseURL, roleData);
      return response.data;
    } catch (error) {
      console.error('Failed to create custom role:', error);
      throw error;
    }
  }

  // Update an existing custom role
  async updateCustomRole(roleId, roleData) {
    try {
      const response = await axios.put(`${this.baseURL}/${roleId}`, roleData);
      return response.data;
    } catch (error) {
      console.error('Failed to update custom role:', error);
      throw error;
    }
  }

  // Delete a custom role
  async deleteCustomRole(roleId) {
    try {
      const response = await axios.delete(`${this.baseURL}/${roleId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete custom role:', error);
      throw error;
    }
  }

  // Get a specific custom role by ID
  async getCustomRole(roleId) {
    try {
      const response = await axios.get(`${this.baseURL}/role/${roleId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get custom role:', error);
      throw error;
    }
  }

  // Get all custom roles for the current company (without requiring companyId parameter)
  async getAllCustomRoles() {
    try {
      // Prefer Redux store, fallback to localStorage. If not found, return empty.
      const storeCompanyId = window.__REDUX_STORE__?.getState?.().companyState?.data?.id;
      const localCompanyId = localStorage.getItem('companyId');
      const companyId = storeCompanyId || (localCompanyId ? Number(localCompanyId) : null);

      if (!companyId) {
        // No company context available yet (not logged in or data not loaded)
        return [];
      }

      return await this.getCustomRoles(companyId);
    } catch (error) {
      // Any errors from getCustomRoles are already handled for 401/403
      return [];
    }
  }
}

// Create singleton instance
const customRoleService = new CustomRoleService();
export default customRoleService;