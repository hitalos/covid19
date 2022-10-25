build: js

js: clean
	npx esbuild --minify --bundle --outdir=assets/js --out-extension:.js=.min.js assets/js/brasil.js assets/js/estados.js

js-dev:
	npx esbuild --sourcemap --watch --bundle --outdir=assets/js --out-extension:.js=.min.js assets/js/brasil.js assets/js/estados.js

clean:
	rm -f assets/js/*.min.js
