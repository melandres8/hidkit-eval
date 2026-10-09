// The frame of every page.
export function layout({ title, content }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title} - Recipe board</title>
<meta property="og:title" content="${title}">
</head>
<body>
<header><a href="/">Recipe board</a> <form action="/search"><input name="q"></form></header>
<main>${content}</main>
</body>
</html>`;
}
