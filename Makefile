default : hjsorth.min.js

hjsorth.min.js : hjsorth.js
	uglifyjs hjsorth.js > hjsorth.min.js
