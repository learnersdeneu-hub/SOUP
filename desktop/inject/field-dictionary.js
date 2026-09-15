// Identical to extension/lib/field-dictionary.js — the same real
// keyword/regex field classifier, shared between the browser-extension
// build and this desktop build so detection behaves identically in both.
var SOUP_FIELD_DICTIONARY = [
  { key: "firstName", label: "First name", group: "personal", patterns: [/first\s*name/i, /given\s*name/i, /^fname$/i] },
  { key: "lastName", label: "Last name", group: "personal", patterns: [/last\s*name/i, /surname/i, /family\s*name/i, /^lname$/i] },
  { key: "fullName", label: "Full name", group: "personal", patterns: [/full\s*name/i, /legal\s*name/i, /^name$/i] },
  { key: "dateOfBirth", label: "Date of birth", group: "personal", patterns: [/date\s*of\s*birth/i, /\bdob\b/i, /birth\s*date/i] },
  { key: "cityOfBirth", label: "City of birth", group: "personal", patterns: [/city\s*of\s*birth/i, /place\s*of\s*birth/i, /birth\s*place/i] },
  { key: "nationality", label: "Nationality", group: "personal", patterns: [/nationality/i, /citizenship/i] },
  { key: "email", label: "Email", group: "contact", patterns: [/e-?mail/i] },
  { key: "phone", label: "Phone number", group: "contact", patterns: [/phone/i, /mobile/i, /telephone/i] },
  { key: "address", label: "Address", group: "contact", patterns: [/permanent\s*address/i, /^address/i, /street/i] },
  { key: "city", label: "City", group: "contact", patterns: [/^city$/i, /\btown\b/i] },
  { key: "postalCode", label: "Postal code", group: "contact", patterns: [/postal\s*code/i, /zip\s*code/i, /\bzip\b/i] },
  { key: "currentCountry", label: "Country of residence", group: "contact", patterns: [/country\s*of\s*residence/i, /current\s*country/i, /^country$/i, /^residence$/i] },
  { key: "emergencyContactName", label: "Emergency contact name", group: "contact", patterns: [/emergency\s*contact\s*name/i] },
  { key: "emergencyContactRelationship", label: "Emergency contact relationship", group: "contact", patterns: [/emergency.*relationship/i, /relationship.*emergency/i] },
  { key: "targetDegreeLevel", label: "Degree level", group: "education", patterns: [/degree\s*level/i, /level\s*of\s*study/i, /qualification\s*level/i] },
  { key: "targetSubject", label: "Programme / subject", group: "education", patterns: [/programme|program\s*(name|title)/i, /course\s*(name|title)/i, /field\s*of\s*study/i, /\bsubject\b/i] },
  { key: "preferredIntake", label: "Intake / start term", group: "education", patterns: [/\bintake\b/i, /start\s*(date|term)/i, /entry\s*term/i] },
  { key: "englishProficiency", label: "English proficiency", group: "education", patterns: [/english\s*(test|proficiency|language)/i, /\bielts\b/i, /\btoefl\b/i] },
  { key: "academicBackground", label: "Academic background", group: "education", patterns: [/academic\s*background/i, /previous\s*education/i, /prior\s*qualification/i] },
  { key: "passportNumber", label: "Passport number", group: "documents", patterns: [/passport\s*(no|number|num)\b/i, /passport$/i] },
  { key: "passportExpiry", label: "Passport expiry", group: "documents", patterns: [/passport.*expir/i] },
];

function soupClassifyField(labelText, name, id) {
  var haystack = (String(labelText || "") + " " + String(name || "") + " " + String(id || "")).toLowerCase();
  for (var i = 0; i < SOUP_FIELD_DICTIONARY.length; i++) {
    var entry = SOUP_FIELD_DICTIONARY[i];
    for (var j = 0; j < entry.patterns.length; j++) {
      if (entry.patterns[j].test(haystack)) return entry;
    }
  }
  return null;
}
