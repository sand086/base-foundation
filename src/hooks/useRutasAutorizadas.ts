import { useState, useEffect, useCallback } from 'react';
import { RutaAutorizada, defaultRutasAutorizadas } from '@/data/rutasData';

const STORAGE_KEY = 'rutas_autorizadas';

export const useRutasAutorizadas = () => {
  const [rutas, setRutas] = useState<RutaAutorizada[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRutas(JSON.parse(stored));
      } catch {
        setRutas(defaultRutasAutorizadas);
      }
    } else {
      setRutas(defaultRutasAutorizadas);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRutasAutorizadas));
    }
  }, []);

  // Save to localStorage whenever rutas change
  const saveToStorage = useCallback((newRutas: RutaAutorizada[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRutas));
    setRutas(newRutas);
  }, []);

  const addRuta = useCallback((ruta: Omit<RutaAutorizada, 'id' | 'fechaCreacion'>) => {
    const newRuta: RutaAutorizada = {
      ...ruta,
      id: `ruta-${Date.now()}`,
      fechaCreacion: new Date().toISOString().split('T')[0],
    };
    const newRutas = [...rutas, newRuta];
    saveToStorage(newRutas);
    return newRuta;
  }, [rutas, saveToStorage]);

  const updateRuta = useCallback((id: string, updates: Partial<RutaAutorizada>) => {
    const newRutas = rutas.map(r => 
      r.id === id ? { ...r, ...updates } : r
    );
    saveToStorage(newRutas);
  }, [rutas, saveToStorage]);

  const deleteRuta = useCallback((id: string) => {
    const newRutas = rutas.filter(r => r.id !== id);
    saveToStorage(newRutas);
  }, [rutas, saveToStorage]);

  const toggleRutaActivo = useCallback((id: string) => {
    const newRutas = rutas.map(r => 
      r.id === id ? { ...r, activo: !r.activo } : r
    );
    saveToStorage(newRutas);
  }, [rutas, saveToStorage]);

  const getRutasActivas = useCallback(() => {
    return rutas.filter(r => r.activo);
  }, [rutas]);

  return {
    rutas,
    rutasActivas: getRutasActivas(),
    addRuta,
    updateRuta,
    deleteRuta,
    toggleRutaActivo,
  };
};
