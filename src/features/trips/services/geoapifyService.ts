// Obtenemos la llave desde el archivo .env
const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

export const geoapifyService = {
  /**
   * Autocompleta direcciones usando Geoapify
   * @param text Texto a buscar (ej: "Zocalo CDMX")
   * @returns Arreglo de features con coordenadas y direcciones formateadas
   */
  autocomplete: async (text: string) => {
    if (!API_KEY) {
      console.warn(" Falta VITE_GEOAPIFY_API_KEY en tu archivo .env");
      return [];
    }

    try {
      //  filter=countrycode:mx restringe los resultados a México para mayor precisión
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&apiKey=${API_KEY}&lang=es&limit=5&filter=countrycode:mx`;

      const requestOptions = {
        method: "GET",
      };

      const response = await fetch(url, requestOptions);
      if (!response.ok) throw new Error("Error en la API de Geoapify");

      const data = await response.json();
      return data.features || [];
    } catch (error) {
      console.error("Error buscando en Geoapify:", error);
      return [];
    }
  },
};
