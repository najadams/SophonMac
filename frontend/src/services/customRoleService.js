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
      console.error('Failed to get custom roles:', error);
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
      // Get company ID from localStorage or Redux store
      const companyId = localStorage.getItem('companyId') || 1; // fallback to 1 for testing
      return await this.getCustomRoles(companyId);
    } catch (error) {
      console.error('Failed to get all custom roles:', error);
      return []; // Return empty array on error
    }
  }
}

// Create singleton instance
const customRoleService = new CustomRoleService();
export default customRoleService;