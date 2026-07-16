from flask import jsonify


def success(data=None, message="Success", status=200):

    return (

        jsonify({

            "success": True,

            "message": message,

            "data": data

        }),

        status

    )


def error(

    message="Something went wrong",

    status=500,

    error_code=None,

    details=None

):

    payload = {

        "success": False,

        "message": message

    }

    if error_code:

        payload["error_code"] = error_code

    if details:

        payload["details"] = details

    return jsonify(payload), status