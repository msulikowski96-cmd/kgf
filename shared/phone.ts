// Phone number normalisation. Polish numbers without a country code get +48.

export function normalizePhone(input: string): string {
  let phone = input.trim().replace(/[\s\-().]/g, "");
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (/^\d{9}$/.test(phone)) phone = "+48" + phone;
  return phone;
}

export function isValidPhone(input: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhone(input));
}

// "+48537353052" -> "+48 537 353 052"
export function formatPhone(input: string): string {
  const phone = normalizePhone(input);
  const pl = /^\+48(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return pl ? `+48 ${pl[1]} ${pl[2]} ${pl[3]}` : phone;
}
