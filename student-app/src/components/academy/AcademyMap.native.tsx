import React from "react";
import { Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";

export function AcademyMap({ lat, lng, name }: { lat: number; lng: number; name: string; address?: string }) {
  return (
    <MapView
      style={{ width: Dimensions.get("window").width - 32, height: 180 }}
      initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title={name} />
    </MapView>
  );
}
