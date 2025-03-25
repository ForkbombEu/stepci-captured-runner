.PHONY: help

PLATFORMS = linux-x64 linux-arm64 linux-aarch64 windows-x64 darwin-x64 darwin-arm64
SOURCES = runner.js
LIBS = node_modules

DEPS = bun
K := $(foreach exec,$(DEPS),\
        $(if $(shell which $(exec)),some string,$(error "🥶 `$(exec)` not found in PATH please install it")))

help: ## 🛟  Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf " \033[36m 👉 %-14s\033[0m %s\n", $$1, $$2}'


all: $(addprefix stepci-captured-runner-, $(PLATFORMS)) ## 🛠️  Build all platforms

stepci-captured-runner: $(SOURCES) $(LIBS) ## 🚀 Build slangroom-exec for the current platform
	bun build --compile --minify --outfile stepci-captured-runner

stepci-captured-runner-%: $(SOURCES) $(LIBS)
	bun build runner.js --compile --minify --target=bun-$*-modern --outfile stepci-captured-runner-$*

clean: ## 🧹 Clean the build
	@rm -f $(addprefix stepci-captured-runner-, $(PLATFORMS))
	@rm -f stepci-captured-runner
	@rm -f stepci-captured-runner-windows-x64.exe
	@echo "🧹 Cleaned the build"


$(LIBS): package.json
	bun i
