
build: node_modules
	npx ng build --configuration production
	cd dist/hcw-stream-lib/ && npm publish

node_modules:
	npm install

test:
	npx ng test hcw-stream-lib

lint:
	npx ng link hcw-stream-lib

clean:
	rm -rf node_modules

version:
	@cat projects/hcw-stream-lib/package.json | jq .version | sed 's/"//g'
