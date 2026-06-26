export { googlePlaces, googleTravel } from "./googleMaps";
export { googleGeocode } from "./geocode";
export { resy } from "./resy";
export { openTable } from "./opentable";
export { ticketmaster } from "./ticketmaster";
export { IntegrationError, fetchJson } from "./http";
export type {
  PlacesProvider,
  PlacesQuery,
  TravelProvider,
  ReservationProvider,
  ReservationSlot,
  ReservationHandoff,
  EventsProvider,
  GeocodeProvider,
} from "./types";

import { googlePlaces, googleTravel } from "./googleMaps";
import { googleGeocode } from "./geocode";
import { resy } from "./resy";
import { openTable } from "./opentable";
import { ticketmaster } from "./ticketmaster";

export const providers = {
  places: googlePlaces,
  travel: googleTravel,
  geocode: googleGeocode,
  reservations: { resy, openTable },
  events: ticketmaster,
} as const;
