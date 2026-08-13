from loguru import logger

from backend.utils.api_response import error


def handle_exception(e):

    logger.exception(e)

    return error(

        message="Internal Server Error",

        status=500,

        error_code="SERVER_ERROR",

        details=str(e)

    )


def register_error_handlers(app):

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return error(
            message="Uploaded file is too large. Maximum supported file size is 500 MB.",
            status=413,
            error_code="FILE_TOO_LARGE"
        )

    @app.errorhandler(Exception)
    def global_exception(e):

        return handle_exception(e)