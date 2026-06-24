// Provider registry. Swap implementations here without touching call sites.
export { googlePlaces, googleTravel } from "./googleMaps";
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
} from "./types";

import { googlePlaces, googleTravel } from "./googleMaps";
import { resy } from "./resy";
import { openTable } from "./opentable";
import { ticketmaster } from "./ticketmaster";

/** Default wiring. Reservation provider can be chosen per venue/market. */
export const providers = {
  places: googlePlaces,
  travel: googleTravel,
  reservations: { resy, openTable },
  events: ticketmaster,
} as const;
