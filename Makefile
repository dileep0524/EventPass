PROTO_FILES := $(shell find proto -name "*.proto")

proto-gen:
	protoc -Iproto -I./googleapis \
	--go_out=proto/gen --go_opt=paths=source_relative \
	--go-grpc_out=proto/gen --go-grpc_opt=paths=source_relative \
	--grpc-gateway_out=proto/gen --grpc-gateway_opt=paths=source_relative \
	$(PROTO_FILES)
