// import React from 'react'

// const Notifications = () => {
//   return (
//       <div className='page'>
//           <div className="heading">
//               <div>
//                   <h1 style={{padding: 10, fontWeight: 200}}>Notifications</h1>
//               </div>
//           </div>
//     </div>
//   )
// }

// export default Notifications

import React, { useEffect, useState } from "react";
import axios from "../config/index";
import { API_BASE_URL } from '../config';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Badge,
  Button
} from "@mui/material";
import {
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon
} from "@mui/icons-material";

const Notifications = ({ companyId = 1 }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/notifications/${companyId}`);
      const data = response.data;

      // Ensure data is an array
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
        console.error("Fetched data is not an array:", data);
      }

      setLoading(false);
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/notifications/${notificationId}/read`);
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'read' }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/notifications/${notificationId}`);
      // Remove from local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(notif => notif.status === 'unread');
    
    try {
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map(notif => 
          axios.patch(`${API_BASE_URL}/api/notifications/${notif.id}/read`)
        )
      );
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, status: 'read' }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [companyId]);

  const unreadCount = notifications.filter(notif => notif.status === 'unread').length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading notifications: {error.message}
      </Alert>
    );
  }

  return (
    <div className="page">
      <Box sx={{ p: 3 }}>
        {/* Header */}Dummy Data
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon fontSize="large" />
            </Badge>
            <Typography variant="h4" component="h1" fontWeight={300}>
              Notifications
            </Typography>
          </Box>
          
          {unreadCount > 0 && (
            <Button 
              variant="outlined" 
              onClick={markAllAsRead}
              startIcon={<MarkReadIcon />}
            >
              Mark All as Read
            </Button>
          )}
        </Box>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <Card>
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.status === 'unread' ? 'action.hover' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.selected'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" mr={2}>
                      {notification.status === 'unread' ? (
                        <NotificationsActiveIcon color="primary" />
                      ) : (
                        <NotificationsIcon color="disabled" />
                      )}
                    </Box>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: notification.status === 'unread' ? 600 : 400,
                              flex: 1
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Chip 
                            label={notification.status} 
                            size="small"
                            color={notification.status === 'unread' ? 'primary' : 'default'}
                            variant={notification.status === 'unread' ? 'filled' : 'outlined'}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {notification.createdAt && !isNaN(new Date(notification.createdAt).getTime()) 
                            ? new Date(notification.createdAt).toLocaleString()
                            : "Invalid Date"
                          }
                        </Typography>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        {notification.status === 'unread' && (
                          <IconButton 
                            edge="end" 
                            aria-label="mark as read"
                            onClick={() => markAsRead(notification.id)}
                            size="small"
                          >
                            <MarkReadIcon />
                          </IconButton>
                        )}
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => deleteNotification(notification.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <NotificationsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No notifications to display
                </Typography>
                <Typography variant="body2" color="text.disabled" mt={1}>
                  You're all caught up! New notifications will appear here.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </div>
  );
};

export default Notifications;
