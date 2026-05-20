.PHONY: install build dev lint typecheck clean

install:
	pnpm install

build:
	pnpm build

dev:
	pnpm dev

lint:
	pnpm lint

typecheck:
	pnpm typecheck

clean:
	pnpm clean
