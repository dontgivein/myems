from datetime import datetime, timedelta
import falcon
import mysql.connector
import simplejson as json
from core.useractivity import access_control, api_key_control
import config


class Reporting:
    def __init__(self):
        """"Initializes Reporting"""
        pass

    @staticmethod
    def on_options(req, resp):
        _ = req
        resp.status = falcon.HTTP_200

    ####################################################################################################################
    # PROCEDURES
    # Step 1: valid parameters
    # Step 2: query analog points latest values
    # Step 3: query energy points latest values
    # Step 4: query digital points latest values
    # Step 5: construct the report
    ####################################################################################################################
    @staticmethod
    def on_get(req, resp):
        if 'API-KEY' not in req.headers or \
                not isinstance(req.headers['API-KEY'], str) or \
                len(str.strip(req.headers['API-KEY'])) == 0:
            access_control(req)
        else:
            api_key_control(req)
        ################################################################################################################
        # Step 1: valid parameters
        ################################################################################################################
        reporting_start_datetime_utc = datetime.utcnow() - timedelta(minutes=60)

        latest_value_data = list()
        cnx_historical = mysql.connector.connect(**config.myems_historical_db)
        cursor_historical = cnx_historical.cursor()

        ################################################################################################################
        # Step 2: query analog points latest values
        ################################################################################################################

        query = (" SELECT point_id, actual_value "
                 " FROM tbl_analog_value_latest "
                 " WHERE utc_date_time > %s ")
        cursor_historical.execute(query, (reporting_start_datetime_utc,))
        rows = cursor_historical.fetchall()
        if rows is not None and len(rows) > 0:
            for row in rows:
                current_value = dict()
                current_value['point_id'] = row[0]
                current_value['value'] = row[1]
                latest_value_data.append(current_value)

        ################################################################################################################
        # Step 3: query energy points latest values
        ################################################################################################################
        query = (" SELECT point_id, actual_value "
                 " FROM tbl_energy_value_latest "
                 " WHERE utc_date_time > %s ")
        cursor_historical.execute(query, (reporting_start_datetime_utc,))
        rows = cursor_historical.fetchall()
        if rows is not None and len(rows) > 0:
            for row in rows:
                current_value = dict()
                current_value['point_id'] = row[0]
                current_value['value'] = row[1]
                latest_value_data.append(current_value)

        ################################################################################################################
        # Step 4: query digital points latest values
        ################################################################################################################

        query = (" SELECT point_id, actual_value "
                 " FROM tbl_digital_value_latest "
                 " WHERE utc_date_time > %s ")
        cursor_historical.execute(query, (reporting_start_datetime_utc,))
        rows = cursor_historical.fetchall()
        if rows is not None and len(rows) > 0:
            for row in rows:
                current_value = dict()
                current_value['point_id'] = row[0]
                current_value['value'] = row[1]
                latest_value_data.append(current_value)

        ################################################################################################################
        # Step 5: construct the report
        ################################################################################################################

        if cursor_historical:
            cursor_historical.close()
        if cnx_historical:
            cnx_historical.close()

        resp.text = json.dumps(latest_value_data)
