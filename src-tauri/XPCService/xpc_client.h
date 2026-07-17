#ifndef XPC_CLIENT_H
#define XPC_CLIENT_H

#include <stdbool.h>
#include <stdint.h>

typedef struct {
    bool success;
    char *error;
    char *payload;
} xpc_result_t;

xpc_result_t xpc_call_helper(const char *mach_service_name,
                             const char *command,
                             const char *host,
                             int64_t port);

void xpc_result_free(xpc_result_t *res);

#endif
