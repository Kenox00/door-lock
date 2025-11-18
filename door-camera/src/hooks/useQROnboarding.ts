import { useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { activateDevice, validateDevice } from '@/lib/apiService';

/**
 * QR Onboarding Hook
 * Handles device onboarding via QR code URL parameters
 * 
 * Expected URL format:
 * /device/connect?deviceId=xxx&token=yyy&type=camera&room=Entrance
 */
export const useQROnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    setDeviceId, 
    setDeviceToken, 
    setDeviceType, 
    setRoom, 
    setActivated,
    setJwt,
    deviceId,
    deviceToken,
    isActivated,
    setError 
  } = useSessionStore();

  /**
   * Extract and validate QR parameters from URL
   */
  const processQRParams = useCallback(async () => {
    console.log('🔍 Processing QR parameters from URL...');
    console.log('📍 Current URL:', window.location.href);
    
    // Handle both camelCase and lowercase parameter names for backwards compatibility
    const deviceIdParam = searchParams.get('deviceId') || searchParams.get('deviceid');
    const tokenParam = searchParams.get('token');
    const typeParam = searchParams.get('type');
    const roomParam = searchParams.get('room');

    console.log('📋 URL Parameters:', {
      deviceId: deviceIdParam ? `Found (${deviceIdParam.substring(0, 8)}...)` : 'Missing',
      token: tokenParam ? `Found (${tokenParam.substring(0, 8)}...)` : 'Missing',
      type: typeParam || 'Missing',
      room: roomParam || 'Not specified'
    });

    // If QR params are present, this is a new onboarding request
    // Accept any device type (camera, esp32-cam, door-lock, etc.)
    if (deviceIdParam && tokenParam && typeParam) {
      console.log('🔗 QR params detected, initiating device onboarding...');
      console.log('📋 Device ID:', deviceIdParam);
      console.log('📋 Token:', tokenParam.substring(0, 10) + '...');
      console.log('📋 Type:', typeParam);
      console.log('📋 Room:', roomParam || 'Not specified');
      
      try {
        // Store values in Zustand (persisted to localStorage)
        console.log('💾 Storing credentials to localStorage...');
        setDeviceId(deviceIdParam);
        setDeviceToken(tokenParam);
        setDeviceType(typeParam);
        if (roomParam) {
          setRoom(roomParam);
        }
        
        // Verify token was stored
        const storedToken = useSessionStore.getState().deviceToken;
        console.log('✅ Token stored:', storedToken ? 'Yes (' + storedToken.substring(0, 10) + '...)' : 'NO - FAILED!');
        
        // Send activation request to backend
        console.log('📤 Sending activation request to backend...');
        const response = await activateDevice({
          deviceId: deviceIdParam,
          token: tokenParam,
          type: typeParam,
          room: roomParam || undefined,
        });
        
        console.log('✅ Device activation response:', response);
        
        // If backend returns a JWT, store it
        if (response.jwt || response.token) {
          setJwt(response.jwt || response.token);
        }
        
        // Mark as activated
        setActivated(true);
        setError(null);
        
        console.log('✅ Device onboarding completed successfully');
        
        // Redirect to home screen
        navigate('/', { replace: true });
      } catch (error: any) {
        console.error('❌ Device activation failed:', error);
        const errorMessage = error.response?.data?.message || 'Device activation failed';
        setError(errorMessage);
        
        // Clear invalid data
        setActivated(false);
        
        // Show error but don't redirect (let user retry)
        console.error('💡 Please check the QR code and try again');
      }
    } else if (deviceId && deviceToken && !isActivated) {
      // No QR params but we have stored credentials - validate them
      console.log('📦 Validating stored device credentials...');
      
      try {
        await validateDevice({
          deviceId,
          token: deviceToken,
        });
        
        console.log('✅ Device credentials validated');
        setActivated(true);
        setError(null);
      } catch (error: any) {
        console.error('❌ Device validation failed:', error);
        const errorMessage = error.response?.data?.message || 'Device validation failed';
        setError(errorMessage);
        
        // Clear invalid credentials
        setActivated(false);
        setDeviceToken(null);
        
        console.warn('⚠️ Device needs to be re-onboarded via QR code');
      }
    } else if (!deviceId || !deviceToken) {
      console.warn('⚠️ No device credentials found - device not onboarded');
      console.log('💡 Scan QR code to onboard this device');
    }
  }, [
    searchParams,
    navigate,
    setDeviceId,
    setDeviceToken,
    setDeviceType,
    setRoom,
    setActivated,
    setJwt,
    setError,
    deviceId,
    deviceToken,
    isActivated,
  ]);

  // Process QR params on mount or when URL params change
  useEffect(() => {
    processQRParams();
  }, [processQRParams]);

  return {
    isActivated,
  };
};
