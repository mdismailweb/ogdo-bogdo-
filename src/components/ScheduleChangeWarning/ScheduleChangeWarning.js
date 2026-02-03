import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Warning as WarningIcon,
  Storage as DatabaseIcon,
  Schedule as ScheduleIcon,
  Visibility as TrackingIcon
} from '@mui/icons-material';

const ScheduleChangeWarning = ({ open, onConfirm, onCancel, userName }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6" component="span">
            Schedule Change Warning
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            You are about to modify your locked schedule
          </Typography>
        </Alert>

        <Typography variant="body1" paragraph>
          Hello <strong>{userName}</strong>, you're requesting to modify your previously locked time schedule.
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          Please be aware that:
        </Typography>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <DatabaseIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="All schedule changes are tracked"
              secondary="Modifications will be recorded in the database with timestamp"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <TrackingIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Change history is maintained"
              secondary="Previous schedule versions and update times are preserved"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <ScheduleIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Management visibility"
              secondary="Schedule changes may be reviewed by supervisors"
            />
          </ListItem>
        </List>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Note:</strong> This action will unlock your schedule for editing. 
            Any changes you make will be permanently recorded with your employee ID and current timestamp.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onCancel} 
          variant="outlined"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="warning"
          sx={{ minWidth: 150 }}
        >
          Proceed with Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleChangeWarning;