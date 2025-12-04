import { toast } from 'react-toastify';

/**
 * Notification utility for displaying sync-related messages to users
 */
class SyncNotificationService {
  /**
   * Display a sync conflict notification
   * @param {Object} conflict - Conflict object from backend
   */
  showConflict(conflict) {
    const { message, table, suggestions = [] } = conflict;
    
    toast.warning(
      <div>
        <strong>Sync Conflict</strong>
        <p>{message}</p>
        {suggestions.length > 0 && (
          <small>Check sync settings for resolution options</small>
        )}
      </div>,
      {
        position: 'top-right',
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }
    );
  }

  /**
   * Display a sync error notification
   * @param {Object} error - Error object from backend
   */
  showError(error) {
    const { message, table, type } = error;
    
    toast.error(
      <div>
        <strong>Sync Error</strong>
        <p>{message}</p>
        {table && <small>Table: {table}</small>}
      </div>,
      {
        position: 'top-right',
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }
    );
  }

  /**
   * Display a sync success notification
   * @param {string} message - Success message
   */
  showSuccess(message) {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  /**
   * Display a sync info notification
   * @param {string} message - Info message
   */
  showInfo(message) {
    toast.info(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }
}

// Create and export singleton instance
const syncNotificationService = new SyncNotificationService();
export default syncNotificationService;
