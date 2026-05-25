.PHONY: prepare_env_local

ifeq ($(OS),Windows_NT)
prepare_env_local:
	@powershell -ExecutionPolicy Bypass -File scripts/prepare-env.ps1
else
prepare_env_local:
	@bash scripts/prepare_env.sh
endif
