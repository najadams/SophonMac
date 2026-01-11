import React from 'react';
import { useSelector } from 'react-redux';
import { hasFeature } from '../../config/plans';
import { Tooltip, Box, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

/**
 * FeatureGate Component
 * 
 * Renders children only if the current company plan has the required feature.
 * Otherwise, renders a fallback (defaulting to a Lock icon with tooltip).
 * 
 * @param {string} feature - The feature key to check (from PLANS.FEATURES)
 * @param {ReactNode} children - Content to show if allowed
 * @param {ReactNode|null} fallback - Content to show if denied (pass null to hide completely)
 * @param {boolean} showLock - Whether to show the default lock icon if fallback is undefined
 */
const FeatureGate = ({ feature, children, fallback, showLock = true }) => {
  const companyPlan = useSelector((state) => state.companyState.data?.plan || 'STARTER');
  const isAllowed = hasFeature(companyPlan, feature);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  if (showLock) {
    return (
      <Tooltip title="Upgrade to access this feature">
        <Box sx={{ display: 'inline-flex', alignItems: 'center', opacity: 0.5, cursor: 'not-allowed' }}>
          <LockIcon fontSize="small" />
        </Box>
      </Tooltip>
    );
  }

  return null;
};

export default FeatureGate;
