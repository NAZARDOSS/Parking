import React, { useEffect } from 'react';
import { Snackbar, Slide, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';

function MapDialog({ open, handleClose }) {
  const handleTransition = (props) => {
    return <Slide direction="right" {...props} />;
  };

  useEffect(() => {
    if (!open) {
      const snackbarElement = document.querySelector('.MuiSnackbar-root');
      if (snackbarElement) {
        snackbarElement.remove();
      }
    }
  }, [open]); 

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      TransitionComponent={handleTransition}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      sx={{
        '& .MuiSnackbarContent-root': {
          backgroundColor: 'white',
          border: '2px solid rgb(23 37 84)',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          padding: '16px',
          color: '#333',
        },
        '& .MuiIconButton-root': {
          color: 'black',
        },
        '& .MuiSnackbarContent-message': {
          display: 'flex',
          alignItems: 'center',
        },
      }}
      message={
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningIcon sx={{ color: 'orange', fontSize: 24 }} />
          <span>Please enable location services in your browser settings</span>
        </Stack>
      }
      action={
        <IconButton
          size="small"
          aria-label="close"
          color="inherit"
          onClick={handleClose}
        >
          <CloseIcon />
        </IconButton>
      }
    />
  );
}

export default MapDialog;
