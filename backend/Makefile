
.DEFAULT_GOAL := build
COMPONENT := backend

.PHONY: install build archive test clean do-release

node_modules:
	@ npx yarn install

build: node_modules

install: build
	install -d -m0755 $(DESTDIR)/usr/share/hcw-athome/backend/
	cp -a .sailsrc app.js cli api config node_modules package.json public views $(DESTDIR)/usr/share/hcw-athome/backend/
	install -d -m0755 $(DESTDIR)/lib/systemd/system/
	cp hcw-athome.service $(DESTDIR)/lib/systemd/system/
	install -d -m0755 $(DESTDIR)/etc/hcw-athome/
	cp .env.dist $(DESTDIR)/etc/hcw-athome/hcw-athome.conf
	cp saml.key nginx/nginx-common nginx/nginx-proxy $(DESTDIR)/etc/hcw-athome/
	install -d -m0755 $(DESTDIR)/usr/share/doc/hcw-athome-backend/nginx-samples/
	cp -a nginx/hcw-athome-doctor.conf nginx/hcw-athome-patient.conf nginx/hcw-athome-scheduler.conf $(DESTDIR)/usr/share/doc/hcw-athome-backend/nginx-samples/
	install -d -m0755 $(DESTDIR)/usr/bin/
	cp helpers/cli.py $(DESTDIR)/usr/bin/hcw
	chmod +x $(DESTDIR)/usr/bin/hcw

docker:
	docker build . -t docker.io/iabsis/hcw-backend

build-podman:
	podman build . -t docker.io/iabsis/hcw-backend
	@ V=$$(cat .version) ; podman tag docker.io/iabsis/hcw-backend:latest docker.io/iabsis/hcw-backend:$$V
	@ podman tag docker.io/iabsis/hcw-backend:latest docker.io/iabsis/hcw-backend:5
	@ V=$$(cat .version) ; echo "Publish podman now with:\n podman push docker.io/iabsis/hcw-backend:$$V\n podman push docker.io/iabsis/hcw-backend:latest\n podman push docker.io/iabsis/hcw-backend:5"

test:
	@ echo "No backend tests"

clean:
	@ echo "cleaning the dist directory"
	@ rm -rf node_modules

create-debian-release:
	@ gbp dch  --ignore-branch
	@ sed -i 's/UNRELEASED/focal/' debian/changelog
	@ head -n 1 debian/changelog| cut -d' ' -f2 | sed 's/[\(\)]*//g' > .version
	@ V=$$(cat .version) ; echo "Release: $$V"

update-redhat-release:
	@ V=$$(cat .version) ; sed -i "s/Version:.*/Version: $$V/" redhat/hcw-athome-backend.spec

do-git-release:
	@ git add debian/changelog redhat/hcw-athome-backend.spec
	@ V=$$(cat .version) ; git tag $$V
	@ V=$$(cat .version) ; echo "Publish git now with:\n git commit -m \"New release $$V\"\n git push --tag"

do-release-all: create-debian-release update-redhat-release do-git-release build-podman
