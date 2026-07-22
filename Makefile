# Root orchestrator for the HCW@Home monorepo build.
#
# dh_auto_build  runs `make`                        -> each component builds (its default goal).
# dh_auto_install runs `make install DESTDIR=...`   -> the goal and DESTDIR are forwarded
#                                                      to every component sub-make via MAKEFLAGS.
#
# hug-angular (the hcw-stream-lib npm library) is published separately to the npm
# registry and is intentionally excluded from the packaged (deb/docker) build.

subdirs = backend admin doctor patient

.PHONY: $(subdirs)

build:   $(subdirs)
install: $(subdirs)
clean:   $(subdirs)
test:    $(subdirs)

$(subdirs):
	$(MAKE) -C $@ $(MAKECMDGOALS)
