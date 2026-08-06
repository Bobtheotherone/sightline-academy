/* Small bundled common-password list for the live strength hint (SPEC-005).
 * The server owns the authoritative top-1000 check; this client copy covers the
 * passwords people actually type first, so the hint reacts before submit.
 * Compared lowercased.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234",
  "passw0rd", "p@ssword", "p@ssw0rd", "mypassword", "newpassword",
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345678910",
  "987654321", "0123456789", "1q2w3e4r5t", "1qaz2wsx3edc", "qwertyuiop",
  "qwerty", "qwerty123", "qwertyuiop123", "asdfghjkl", "asdfghjkl123",
  "zxcvbnm123", "abc123", "abcd1234", "abcdefgh", "abcdefg123", "aaaaaaaaaa",
  "iloveyou", "iloveyou12", "iloveyou123", "welcome", "welcome1", "welcome123",
  "letmein", "letmein123", "trustno1", "sunshine", "sunshine123", "princess",
  "monkey123", "dragon123", "shadow123", "master123", "superman123",
  "batman123", "football", "football1", "football123", "baseball", "baseball1",
  "basketball", "soccer123", "hockey123", "liverpool", "liverpool1",
  "manchester", "arsenal123", "chelsea123", "starwars123", "pokemon123",
  "minecraft1", "computer", "computer1", "computer123", "internet1",
  "whatever1", "whatever123", "changeme", "changeme123", "letmein12",
  "secret123", "freedom123", "charlie123", "michael123", "jessica123",
  "jennifer1", "michelle1", "anthony123", "matthew123", "danielle1",
  "chocolate", "chocolate1", "butterfly1", "flower123", "summer2024",
  "summer2025", "winter2024", "winter2025", "spring2025", "autumn2025",
  "january2025", "america123", "fuckyou123", "asshole123", "pussy12345",
  "harley1234", "hunter1234", "ranger1234", "yamaha1234", "honda12345",
  "mustang123", "corvette12", "chevrolet1", "motorcycle", "fourwheeler",
  "atvrider123", "1234qwerty", "admin12345", "administrator", "rootroot123",
  "guest12345", "temp123456", "test123456", "demo123456", "sample1234",
  "default123", "spiderman1", "metallica1", "nirvana123", "slipknot666",
  "blink18212", "greenday123", "1111111111", "2222222222", "0000000000",
  "1234512345", "6543216543", "qazwsxedcrfv", "zaq12wsxcde3", "1q2w3e4r5t6y",
]);

export function isCommonPassword(candidate: string): boolean {
  return COMMON_PASSWORDS.has(candidate.trim().toLowerCase());
}
