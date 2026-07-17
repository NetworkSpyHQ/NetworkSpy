#include "xpc_client.h"
#include <xpc/xpc.h>
#include <dispatch/dispatch.h>
#include <stdlib.h>
#include <string.h>

xpc_result_t xpc_call_helper(const char *mach_service_name,
                             const char *command,
                             const char *host,
                             int64_t port) {
    xpc_result_t result = { .success = false, .error = NULL, .payload = NULL };

    xpc_connection_t conn = xpc_connection_create_mach_service(
        mach_service_name,
        dispatch_get_main_queue(),
        XPC_CONNECTION_MACH_SERVICE_PRIVILEGED);

    if (!conn) {
        result.error = strdup("failed to create XPC connection");
        return result;
    }

    xpc_connection_set_event_handler(conn, ^(xpc_object_t event) {
        xpc_type_t type = xpc_get_type(event);
        if (type == XPC_TYPE_ERROR) {
            const char *desc = xpc_dictionary_get_string(event, XPC_ERROR_KEY_DESCRIPTION);
            if (desc) {
                fprintf(stderr, "XPC error: %s\n", desc);
            }
        }
    });

    xpc_connection_resume(conn);

    xpc_object_t msg = xpc_dictionary_create(NULL, NULL, 0);
    xpc_dictionary_set_string(msg, "command", command);
    if (host) {
        xpc_dictionary_set_string(msg, "host", host);
    }
    if (port > 0) {
        xpc_dictionary_set_int64(msg, "port", port);
    }

    xpc_object_t reply = xpc_connection_send_message_with_reply_sync(conn, msg);
    xpc_release(msg);

    if (!reply) {
        result.error = strdup("no reply from helper");
        goto cleanup;
    }

    xpc_type_t rtype = xpc_get_type(reply);
    if (rtype == XPC_TYPE_DICTIONARY) {
        const char *status = xpc_dictionary_get_string(reply, "status");
        const char *payload = xpc_dictionary_get_string(reply, "payload");
        if (status && strcmp(status, "ok") == 0) {
            result.success = true;
        }
        if (payload) {
            result.payload = strdup(payload);
        }
    } else if (rtype == XPC_TYPE_ERROR) {
        const char *desc = xpc_dictionary_get_string(reply, XPC_ERROR_KEY_DESCRIPTION);
        if (desc) {
            result.error = strdup(desc);
        } else {
            result.error = strdup("unknown XPC error");
        }
    }

    xpc_release(reply);

cleanup:
    xpc_release(conn);
    return result;
}

void xpc_result_free(xpc_result_t *res) {
    if (res->error)  free(res->error);
    if (res->payload) free(res->payload);
    res->error = NULL;
    res->payload = NULL;
}
