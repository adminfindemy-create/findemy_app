import { Alert, Linking } from 'react-native';

// wa.me needs bare digits with country code, no "+"/spaces. Numbers in this
// app are stored as plain 10-digit Indian mobile numbers (see profile.tsx's
// formatPhone), so a bare 10-digit number gets the +91 country code prefixed;
// anything else (already has a country code) is passed through as-is.
function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  const url = `https://wa.me/${toWhatsAppDigits(phone)}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open WhatsApp", 'Please make sure WhatsApp is installed, or try again.');
  }
}
