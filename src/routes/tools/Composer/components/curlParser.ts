export interface ParsedCurl {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  body: string | null;
}

export function parseCurl(input: string): ParsedCurl {
  const result: ParsedCurl = {
    method: "GET",
    url: "",
    headers: [],
    body: null,
  };

  const cleaned = input
    .replace(/^curl\s+/i, "")
    .replace(/\\\n/g, " ")
    .replace(/\\\r\n/g, " ")
    .trim();

  const tokens = tokenize(cleaned);

  let i = 0;
  let hasData = false;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      i++;
      if (i < tokens.length) {
        result.method = tokens[i].toUpperCase();
      }
    } else if (token === "-H" || token === "--header") {
      i++;
      if (i < tokens.length) {
        const header = parseHeader(tokens[i]);
        if (header) result.headers.push(header);
      }
    } else if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary"
    ) {
      i++;
      if (i < tokens.length) {
        result.body = stripQuotes(tokens[i]);
        hasData = true;
      }
    } else if (token.startsWith("-") || token.startsWith("--")) {
      // skip unknown flags and their values
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        // check if next token looks like a value (not a flag)
        const parts = token.split("=");
        if (parts.length === 2) {
          // --flag=value form, skip
        } else {
          i++; // skip value
        }
      }
    } else if (!result.url) {
      result.url = stripQuotes(token);
    }

    i++;
  }

  if (hasData && result.method === "GET") {
    result.method = "POST";
  }

  return result;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    while (i < input.length && input[i] === " ") i++;
    if (i >= input.length) break;

    if (input[i] === "'" || input[i] === '"') {
      const quote = input[i];
      i++;
      let val = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < input.length) {
          i++;
        }
        val += input[i];
        i++;
      }
      i++; // skip closing quote
      tokens.push(val);
    } else if (input[i] === "$" && i + 1 < input.length && input[i + 1] === "(") {
      // skip $() subshell
      i += 2;
      let depth = 1;
      while (i < input.length && depth > 0) {
        if (input[i] === "(") depth++;
        else if (input[i] === ")") depth--;
        i++;
      }
    } else {
      let val = "";
      while (i < input.length && input[i] !== " " && input[i] !== "'" && input[i] !== '"') {
        if (input[i] === "\\" && i + 1 < input.length) {
          i++;
        }
        val += input[i];
        i++;
      }
      // handle --flag=value
      const eqIdx = val.indexOf("=");
      if (eqIdx > 0 && !val.startsWith("-")) {
        tokens.push(val.substring(0, eqIdx));
        tokens.push("=");
        tokens.push(val.substring(eqIdx + 1));
      } else {
        tokens.push(val);
      }
    }
  }

  return tokens;
}

function parseHeader(raw: string): { key: string; value: string } | null {
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) return null;
  return {
    key: raw.substring(0, colonIdx).trim(),
    value: raw.substring(colonIdx + 1).trim(),
  };
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}
