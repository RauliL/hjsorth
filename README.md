HTML + JavaScript + Forth = HJSorth
===================================

> JavaScript is so bad we might as well replace it with Forth.

HJSorth is a minimal Forth interpreter written with JavaScript. It can be used
to embed scripts written in Forth instead of JavaScript to HTML documents.

Just load `hjsorth.js` in your document and all `<script>` tags which `type`
attribute is `application/forth` are interpreted as Forth.

Hello, World! -example
----------------------

Below is an example which outputs text *Hello, Forth!* in the HTML document.

```html
<!DOCTYPE html>
<html>
<head>
  <title>HJSorth example</title>
  <meta charset="UTF-8">
  <script src="./hjsorth.js"></script>
</head>
<body>
  <script type="application/forth">
    : HELLO ." Hello, Forth!" ;
    HELLO
  </script>
</body>
</html>
```

Standards compliance
--------------------

HJSorth implements most of the words from core word set of [ANS Forth 94][1].
Some words are missing, particulary those which are related to numeric output
conversion, input buffer manipulation as well as all the optional word sets.

Notice that HJSorth is case sensitive.

All kinds of error testing is largely absent. If things fail, they just fail.

JavaScript interoperability
---------------------------

HJSorth contains additional non-standard words which are meant to include
interoperatibility with JavaScript. These are:

### JS-STRING"

```
( "ccc<quote>" -- x )
```

Parse ccc delimited by `"` (double-quote). Convert the parsed string into a
JavaScript string and append it to the top of the stack.

### JS-VARIABLE

```
( "<spaces>name" -- x )
```

Skip leading space delimiters. Parse name delimited by a space. Put global
variable identified by that name into top of the stack.

### JS-PROPERTY@

```
( "<spaces>name" x1 -- x2 )
```

Skip leading space delimiters. Parse name delimited by a space. *x2* will be
the value of JavaScript property `x1.name`.

### JS-PROPERTY!

```
( "<spaces>name" x1 x2 -- )
```

Skip leading space delimieters. Parse name delimited by a space. *x1* will be
assigned as JavaScript property `x2.name`.

### JS-CALL

```
( x1 u -- x2 )
```

Will extract u number of values from the stack and call *x1* as JavaScript
function with those arguments. *x2* will be the result of that function call.

[1]: http://lars.nocrew.org/dpans/dpans1.htm 
