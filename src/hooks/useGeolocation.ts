import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation(watch = false) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, loading: false, error: 'Geolocation not supported' }));
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      setState({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        loading: false,
        error: null,
      });
    };

    const onError = (err: GeolocationPositionError) => {
      setState(s => ({ ...s, loading: false, error: err.message }));
    };

    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 };

    if (watch) {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, opts);
      return () => navigator.geolocation.clearWatch(id);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
    }
  }, [watch]);

  return state;
}
