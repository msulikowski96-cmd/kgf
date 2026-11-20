import React, { createContext, useContext, useMemo, useState } from "react";
import type { Place } from "@shared/fleet";

// Pickup and destination chosen on the search screen, shared with booking
interface BookingDraft {
  pickup: Place | null;
  destination: Place | null;
  setPickup: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  swap: () => void;
  reset: () => void;
}

const BookingDraftContext = createContext<BookingDraft | undefined>(undefined);

export function BookingDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pickup, setPickup] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);

  const value = useMemo(
    () => ({
      pickup,
      destination,
      setPickup,
      setDestination,
      swap: () => {
        setPickup(destination);
        setDestination(pickup);
      },
      reset: () => {
        setPickup(null);
        setDestination(null);
      },
    }),
    [pickup, destination],
  );

  return (
    <BookingDraftContext.Provider value={value}>
      {children}
    </BookingDraftContext.Provider>
  );
}

export function useBookingDraft() {
  const ctx = useContext(BookingDraftContext);
  if (!ctx)
    throw new Error("useBookingDraft must be used within BookingDraftProvider");
  return ctx;
}
