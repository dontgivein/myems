import React, { Fragment, useEffect, useState, useContext } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  ButtonGroup,
  Form,
  FormGroup,
  Input,
  Label,
  CustomInput,
  Spinner
} from 'reactstrap';
import CountUp from 'react-countup';
import moment from 'moment';
import loadable from '@loadable/component';
import Cascader from 'rc-cascader';
import CardSummary from '../common/CardSummary';
import MultipleLineChart from '../common/MultipleLineChart';
import { getCookieValue, createCookie, checkEmpty } from '../../../helpers/utils';
import withRedirect from '../../../hoc/withRedirect';
import { withTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import ButtonIcon from '../../common/ButtonIcon';
import { APIBaseURL, settings } from '../../../config';
import { periodTypeOptions } from '../common/PeriodTypeOptions';
import MultiTrendChart from '../common/MultiTrendChart';
import DateRangePickerWrapper from '../common/DateRangePickerWrapper';
import { endOfDay } from 'date-fns';
import AppContext from '../../../context/Context';
import blankPage from '../../../assets/img/generic/blank-page.png';

const DetailedDataTable = loadable(() => import('../common/DetailedDataTable'));

const MeterComparison = ({ setRedirect, setRedirectUrl, t }) => {
  let current_moment = moment();
  useEffect(() => {
    let is_logged_in = getCookieValue('is_logged_in');
    let user_name = getCookieValue('user_name');
    let user_display_name = getCookieValue('user_display_name');
    let user_uuid = getCookieValue('user_uuid');
    let token = getCookieValue('token');
    if (checkEmpty(is_logged_in) || checkEmpty(token) || checkEmpty(user_uuid) || !is_logged_in) {
      setRedirectUrl(`/authentication/basic/login`);
      setRedirect(true);
    } else {
      //update expires time of cookies
      createCookie('is_logged_in', true, settings.cookieExpireTime);
      createCookie('user_name', user_name, settings.cookieExpireTime);
      createCookie('user_display_name', user_display_name, settings.cookieExpireTime);
      createCookie('user_uuid', user_uuid, settings.cookieExpireTime);
      createCookie('token', token, settings.cookieExpireTime);
    }
  });

  useEffect(() => {
    let timer = setInterval(() => {
      let is_logged_in = getCookieValue('is_logged_in');
      if (is_logged_in === null || !is_logged_in) {
        setRedirectUrl(`/authentication/basic/login`);
        setRedirect(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [setRedirect, setRedirectUrl]);

  // State
  //Query Form
  const [selectedSpaceName1, setSelectedSpaceName1] = useState(undefined);
  const [selectedSpaceName2, setSelectedSpaceName2] = useState(undefined);
  const [meterList1, setMeterList1] = useState([]);
  const [meterList2, setMeterList2] = useState([]);
  const [filteredMeterList1, setFilteredMeterList1] = useState([]);
  const [filteredMeterList2, setFilteredMeterList2] = useState([]);
  const [selectedMeter1, setSelectedMeter1] = useState(undefined);
  const [selectedMeter2, setSelectedMeter2] = useState(undefined);
  const [periodType, setPeriodType] = useState('daily');
  const [cascaderOptions, setCascaderOptions] = useState(undefined);
  const [reportingPeriodDateRange, setReportingPeriodDateRange] = useState([
    current_moment
      .clone()
      .startOf('month')
      .toDate(),
    current_moment.toDate()
  ]);
  const dateRangePickerLocale = {
    sunday: t('sunday'),
    monday: t('monday'),
    tuesday: t('tuesday'),
    wednesday: t('wednesday'),
    thursday: t('thursday'),
    friday: t('friday'),
    saturday: t('saturday'),
    ok: t('ok'),
    today: t('today'),
    yesterday: t('yesterday'),
    hours: t('hours'),
    minutes: t('minutes'),
    seconds: t('seconds'),
    last7Days: t('last7Days'),
    formattedMonthPattern: 'yyyy-MM-dd'
  };
  const dateRangePickerStyle = { display: 'block', zIndex: 10 };
  const { language } = useContext(AppContext);

  // buttons
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(true);
  const [spinnerHidden, setSpinnerHidden] = useState(true);
  const [exportButtonHidden, setExportButtonHidden] = useState(true);
  const [resultDataHidden, setResultDataHidden] = useState(true);
  //Results
  const [meter1, setMeter1] = useState({
    name: undefined,
    energy_category_id: undefined,
    energy_category_name: undefined,
    unit_of_measure: undefined
  });
  const [meter2, setMeter2] = useState({
    name: undefined,
    energy_category_id: undefined,
    energy_category_name: undefined,
    unit_of_measure: undefined
  });
  const [reportingPeriodEnergyConsumptionInCategory1, setReportingPeriodEnergyConsumptionInCategory1] = useState(0);
  const [reportingPeriodEnergyConsumptionInCategory2, setReportingPeriodEnergyConsumptionInCategory2] = useState(0);
  const [reportingPeriodEnergyConsumptionInDifference, setReportingPeriodEnergyConsumptionInDifference] = useState(0);
  const [meterLineChartData1, setMeterLineChartData1] = useState({ a0: [] });
  const [meterLineChartData2, setMeterLineChartData2] = useState({ a0: [] });
  const [meterLineChartLabels1, setMeterLineChartLabels1] = useState({ a0: [] });
  const [meterLineChartLabels2, setMeterLineChartLabels2] = useState({ a0: [] });
  const [parameterLineChartOptions, setParameterLineChartOptions] = useState([]);
  const [parameterLineChartData, setParameterLineChartData] = useState({});
  const [parameterLineChartLabels, setParameterLineChartLabels] = useState([]);
  const [detailedDataTableColumns, setDetailedDataTableColumns] = useState([
    { dataField: 'startdatetime', text: t('Datetime'), sort: true }
  ]);
  const [detailedDataTableData, setDetailedDataTableData] = useState([]);
  const [excelBytesBase64, setExcelBytesBase64] = useState(undefined);

  useEffect(() => {
    let isResponseOK = false;
    fetch(APIBaseURL + '/spaces/tree', {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        'User-UUID': getCookieValue('user_uuid'),
        Token: getCookieValue('token')
      },
      body: null
    })
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
        }
        return response.json();
      })
      .then(json => {
        if (isResponseOK) {
          // rename keys
          json = JSON.parse(
            JSON.stringify([json])
              .split('"id":')
              .join('"value":')
              .split('"name":')
              .join('"label":')
          );
          setCascaderOptions(json);
          setSelectedSpaceName1([json[0]].map(o => o.label));
          setSelectedSpaceName2([json[0]].map(o => o.label));
          let selectedSpaceID = [json[0]].map(o => o.value);
          // get Meters by root Space ID
          let isResponseOK = false;
          fetch(APIBaseURL + '/spaces/' + selectedSpaceID + '/meters', {
            method: 'GET',
            headers: {
              'Content-type': 'application/json',
              'User-UUID': getCookieValue('user_uuid'),
              Token: getCookieValue('token')
            },
            body: null
          })
            .then(response => {
              if (response.ok) {
                isResponseOK = true;
              }
              return response.json();
            })
            .then(json => {
              if (isResponseOK) {
                json = JSON.parse(
                  JSON.stringify([json])
                    .split('"id":')
                    .join('"value":')
                    .split('"name":')
                    .join('"label":')
                );

                setMeterList1(json[0]);
                setMeterList2(json[0]);
                setFilteredMeterList1(json[0]);
                setFilteredMeterList2(json[0]);
                if (json[0].length > 0) {
                  setSelectedMeter1(json[0][0].value);
                  setSelectedMeter2(json[0][0].value);
                  // enable submit button
                  setSubmitButtonDisabled(false);
                } else {
                  setSelectedMeter1(undefined);
                  setSelectedMeter2(undefined);
                  // disable submit button
                  setSubmitButtonDisabled(true);
                }
              } else {
                toast.error(t(json.description));
              }
            })
            .catch(err => {
              console.log(err);
            });
          // end of get Meters by root Space ID
        } else {
          toast.error(t(json.description));
        }
      })
      .catch(err => {
        console.log(err);
      });
  }, [t]);

  const labelClasses = 'ls text-uppercase text-600 font-weight-semi-bold mb-0';

  let onSpaceCascaderChange1 = (value, selectedOptions) => {
    setSelectedSpaceName1(selectedOptions.map(o => o.label).join('/'));
    let selectedSpaceID = value[value.length - 1];
    let isResponseOK = false;
    fetch(APIBaseURL + '/spaces/' + selectedSpaceID + '/meters', {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        'User-UUID': getCookieValue('user_uuid'),
        Token: getCookieValue('token')
      },
      body: null
    })
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
        }
        return response.json();
      })
      .then(json => {
        if (isResponseOK) {
          json = JSON.parse(
            JSON.stringify([json])
              .split('"id":')
              .join('"value":')
              .split('"name":')
              .join('"label":')
          );

          setMeterList1(json[0]);
          setFilteredMeterList1(json[0]);
          if (json[0].length > 0) {
            setSelectedMeter1(json[0][0].value);
            // enable submit button
            setSubmitButtonDisabled(false);
          } else {
            setSelectedMeter1(undefined);
            // disable submit button
            setSubmitButtonDisabled(true);
          }
        } else {
          toast.error(t(json.description));
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  let onSpaceCascaderChange2 = (value, selectedOptions) => {
    setSelectedSpaceName2(selectedOptions.map(o => o.label).join('/'));
    let selectedSpaceID = value[value.length - 1];
    let isResponseOK = false;
    fetch(APIBaseURL + '/spaces/' + selectedSpaceID + '/meters', {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        'User-UUID': getCookieValue('user_uuid'),
        Token: getCookieValue('token')
      },
      body: null
    })
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
        }
        return response.json();
      })
      .then(json => {
        if (isResponseOK) {
          json = JSON.parse(
            JSON.stringify([json])
              .split('"id":')
              .join('"value":')
              .split('"name":')
              .join('"label":')
          );

          setMeterList2(json[0]);
          setFilteredMeterList2(json[0]);
          if (json[0].length > 0) {
            setSelectedMeter2(json[0][0].value);
            // enable submit button
            setSubmitButtonDisabled(false);
          } else {
            setSelectedMeter2(undefined);
            // disable submit button
            setSubmitButtonDisabled(true);
          }
        } else {
          toast.error(t(json.description));
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  const onSearchMeter1 = ({ target }) => {
    const keyword = target.value.toLowerCase();
    const filteredResult = meterList1.filter(meter => meter.label.toLowerCase().includes(keyword));
    setFilteredMeterList1(keyword.length ? filteredResult : meterList1);
    if (filteredResult.length > 0) {
      setSelectedMeter1(filteredResult[0].value);
      // enable submit button
      setSubmitButtonDisabled(false);
    } else {
      setSelectedMeter1(undefined);
      // disable submit button
      setSubmitButtonDisabled(true);
    }
    let customInputTarget = document.getElementById('meterSelect1');
    customInputTarget.value = filteredResult[0].value;
  };

  const onSearchMeter2 = ({ target }) => {
    const keyword = target.value.toLowerCase();
    const filteredResult = meterList2.filter(meter => meter.label.toLowerCase().includes(keyword));
    setFilteredMeterList1(keyword.length ? filteredResult : meterList2);
    if (filteredResult.length > 0) {
      setSelectedMeter1(filteredResult[0].value);
      // enable submit button
      setSubmitButtonDisabled(false);
    } else {
      setSelectedMeter1(undefined);
      // disable submit button
      setSubmitButtonDisabled(true);
    }
    let customInputTarget = document.getElementById('meterSelect2');
    customInputTarget.value = filteredResult[0].value;
  };

  // Callback fired when value changed
  let onReportingPeriodChange = DateRange => {
    if (DateRange == null) {
      setReportingPeriodDateRange([null, null]);
    } else {
      if (moment(DateRange[1]).format('HH:mm:ss') === '00:00:00') {
        // if the user did not change time value, set the default time to the end of day
        DateRange[1] = endOfDay(DateRange[1]);
      }
      setReportingPeriodDateRange([DateRange[0], DateRange[1]]);
      const dateDifferenceInSeconds = moment(DateRange[1]).valueOf() / 1000 - moment(DateRange[0]).valueOf() / 1000;
      if (periodType === 'hourly') {
        if (dateDifferenceInSeconds > 3 * 365 * 24 * 60 * 60) {
          // more than 3 years
          setPeriodType('yearly');
          document.getElementById('periodType').value = 'yearly';
        } else if (dateDifferenceInSeconds > 6 * 30 * 24 * 60 * 60) {
          // more than 6 months
          setPeriodType('monthly');
          document.getElementById('periodType').value = 'monthly';
        } else if (dateDifferenceInSeconds > 30 * 24 * 60 * 60) {
          // more than 30 days
          setPeriodType('daily');
          document.getElementById('periodType').value = 'daily';
        }
      } else if (periodType === 'daily') {
        if (dateDifferenceInSeconds >= 3 * 365 * 24 * 60 * 60) {
          // more than 3 years
          setPeriodType('yearly');
          document.getElementById('periodType').value = 'yearly';
        } else if (dateDifferenceInSeconds >= 6 * 30 * 24 * 60 * 60) {
          // more than 6 months
          setPeriodType('monthly');
          document.getElementById('periodType').value = 'monthly';
        }
      } else if (periodType === 'monthly') {
        if (dateDifferenceInSeconds >= 3 * 365 * 24 * 60 * 60) {
          // more than 3 years
          setPeriodType('yearly');
          document.getElementById('periodType').value = 'yearly';
        }
      }
    }
  };

  // Callback fired when value clean
  let onReportingPeriodClean = event => {
    setReportingPeriodDateRange([null, null]);
  };

  // Handler
  const handleSubmit = e => {
    e.preventDefault();
    // disable submit button
    setSubmitButtonDisabled(true);
    // show spinner
    setSpinnerHidden(false);
    // hide export button
    setExportButtonHidden(true);
    // hide result data
    setResultDataHidden(true);

    // Reinitialize tables
    setDetailedDataTableData([]);

    let isResponseOK = false;
    fetch(
      APIBaseURL +
        '/reports/metercomparison?' +
        'meterid1=' +
        selectedMeter1 +
        '&meterid2=' +
        selectedMeter2 +
        '&periodtype=' +
        periodType +
        '&reportingperiodstartdatetime=' +
        moment(reportingPeriodDateRange[0]).format('YYYY-MM-DDTHH:mm:ss') +
        '&reportingperiodenddatetime=' +
        moment(reportingPeriodDateRange[1]).format('YYYY-MM-DDTHH:mm:ss') +
        '&language=' +
        language,
      {
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
          'User-UUID': getCookieValue('user_uuid'),
          Token: getCookieValue('token')
        },
        body: null
      }
    )
      .then(response => {
        if (response.ok) {
          isResponseOK = true;
        }
        return response.json();
      })
      .then(json => {
        if (isResponseOK) {
          setMeter1({
            name: json['meter1']['name'],
            energy_category_id: json['meter1']['energy_category_id'],
            energy_category_name: json['meter1']['energy_category_name'],
            unit_of_measure: json['meter1']['unit_of_measure']
          });
          setMeter2({
            name: json['meter2']['name'],
            energy_category_id: json['meter2']['energy_category_id'],
            energy_category_name: json['meter2']['energy_category_name'],
            unit_of_measure: json['meter2']['unit_of_measure']
          });
          setReportingPeriodEnergyConsumptionInCategory1(json['reporting_period1']['total_in_category']);
          setReportingPeriodEnergyConsumptionInCategory2(json['reporting_period2']['total_in_category']);
          setReportingPeriodEnergyConsumptionInDifference(json['diff']['total_in_category']);
          let names1 = [];
          names1.push({ value: 'a0', label: json['meter1']['energy_category_name'] });

          let names2 = [];
          names2.push({ value: 'a0', label: json['meter2']['energy_category_name'] });

          let timestamps1 = {};
          timestamps1['a0'] = json['reporting_period1']['timestamps'];
          setMeterLineChartLabels1(timestamps1);

          let timestamps2 = {};
          timestamps2['a0'] = json['reporting_period2']['timestamps'];
          setMeterLineChartLabels2(timestamps2);

          let values1 = { a0: [] };
          json['reporting_period1']['values'].forEach((currentValue, index) => {
            values1['a0'][index] = currentValue.toFixed(2);
          });
          setMeterLineChartData1(values1);

          let values2 = { a0: [] };
          json['reporting_period2']['values'].forEach((currentValue, index) => {
            values2['a0'][index] = currentValue.toFixed(2);
          });
          setMeterLineChartData2(values2);

          names1 = [];
          let index1 = 0;
          json['parameters1']['names'].forEach((currentValue, index) => {
            names1.push({ value: 'a' + index1, label: currentValue });
            index1 = index1 + 1;
          });
          json['parameters2']['names'].forEach((currentValue, index) => {
            names1.push({ value: 'a' + index1, label: currentValue });
            index1 = index1 + 1;
          });
          setParameterLineChartOptions(names1);

          timestamps1 = {};
          index1 = 0;
          json['parameters1']['timestamps'].forEach((currentValue, index) => {
            timestamps1['a' + index1] = currentValue;
            index1 = index1 + 1;
          });
          json['parameters2']['timestamps'].forEach((currentValue, index) => {
            timestamps1['a' + index1] = currentValue;
            index1 = index1 + 1;
          });
          setParameterLineChartLabels(timestamps1);

          index1 = 0;
          let values = { a0: [] };
          json['parameters1']['values'].forEach((currentValue, index) => {
            values['a' + index1] = currentValue;
            index1 += 1;
          });
          json['parameters2']['values'].forEach((currentValue, index) => {
            values['a' + index1] = currentValue;
            index1 += 1;
          });
          setParameterLineChartData(values);

          setDetailedDataTableColumns([
            {
              dataField: 'startdatetime',
              text: t('Datetime'),
              sort: true
            },
            {
              dataField: 'a0',
              text:
                json['meter1']['name'] +
                json['meter1']['energy_category_name'] +
                ' (' +
                json['meter1']['unit_of_measure'] +
                ')',
              sort: true,
              formatter: function(decimalValue) {
                if (typeof decimalValue === 'number') {
                  return decimalValue.toFixed(2);
                } else {
                  return null;
                }
              }
            },
            {
              dataField: 'a1',
              text:
                json['meter2']['name'] +
                json['meter2']['energy_category_name'] +
                ' (' +
                json['meter2']['unit_of_measure'] +
                ')',
              sort: true,
              formatter: function(decimalValue) {
                if (typeof decimalValue === 'number') {
                  return decimalValue.toFixed(2);
                } else {
                  return null;
                }
              }
            },
            {
              dataField: 'a2',
              text: t('Reporting Period Difference CATEGORY UNIT', {
                CATEGORY: json['meter1']['energy_category_name'],
                UNIT: '(' + json['meter1']['unit_of_measure'] + ')'
              }),
              sort: true,
              formatter: function(decimalValue) {
                if (typeof decimalValue === 'number') {
                  return decimalValue.toFixed(2);
                } else {
                  return null;
                }
              }
            }
          ]);

          let detailed_value_list = [];
          json['reporting_period1']['timestamps'].forEach((currentTimestamp, timestampIndex) => {
            let detailed_value = {};
            detailed_value['id'] = timestampIndex;
            detailed_value['startdatetime'] = currentTimestamp;
            detailed_value['a0'] = json['reporting_period1']['values'][timestampIndex];
            detailed_value['a1'] = json['reporting_period2']['values'][timestampIndex];
            detailed_value['a2'] = json['diff']['values'][timestampIndex];
            detailed_value_list.push(detailed_value);
          });

          let detailed_value = {};
          detailed_value['id'] = detailed_value_list.length;
          detailed_value['startdatetime'] = t('Total');
          detailed_value['a0'] = json['reporting_period1']['total_in_category'];
          detailed_value['a1'] = json['reporting_period2']['total_in_category'];
          detailed_value['a2'] = json['diff']['total_in_category'];
          detailed_value_list.push(detailed_value);
          setTimeout(() => {
            setDetailedDataTableData(detailed_value_list);
          }, 0);

          setExcelBytesBase64(json['excel_bytes_base64']);

          // enable submit button
          setSubmitButtonDisabled(false);
          // hide spinner
          setSpinnerHidden(true);
          // show export button
          setExportButtonHidden(false);
          // show result data
          setResultDataHidden(false);
        } else {
          toast.error(t(json.description));
          setSpinnerHidden(true);
          setSubmitButtonDisabled(false);
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  const handleExport = e => {
    e.preventDefault();
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = 'metercomparison.xlsx';
    var fileUrl = 'data:' + mimeType + ';base64,' + excelBytesBase64;
    fetch(fileUrl)
      .then(response => response.blob())
      .then(blob => {
        var link = window.document.createElement('a');
        link.href = window.URL.createObjectURL(blob, { type: mimeType });
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  return (
    <Fragment>
      <div>
        <Breadcrumb>
          <BreadcrumbItem>{t('Meter Data')}</BreadcrumbItem>
          <BreadcrumbItem active>{t('Meter Comparison')}</BreadcrumbItem>
        </Breadcrumb>
      </div>
      <Card className="bg-light mb-3">
        <CardBody className="p-3">
          <Form onSubmit={handleSubmit}>
            <Row form>
              <Col xs={6} sm={3}>
                <FormGroup className="form-group">
                  <Label className={labelClasses} for="space">
                    {t('Space')}1
                  </Label>
                  <br />
                  <Cascader
                    options={cascaderOptions}
                    onChange={onSpaceCascaderChange1}
                    changeOnSelect
                    expandTrigger="hover"
                  >
                    <Input bsSize="sm" value={selectedSpaceName1 || ''} readOnly />
                  </Cascader>
                </FormGroup>
              </Col>
              <Col xs="auto">
                <FormGroup>
                  <Label className={labelClasses} for="meterSelect1">
                    {t('Meter')}1
                  </Label>

                  <Form inline>
                    <Input placeholder={t('Search')} bsSize="sm" onChange={onSearchMeter1} />
                    <CustomInput
                      type="select"
                      id="meterSelect1"
                      name="meterSelect1"
                      bsSize="sm"
                      onChange={({ target }) => setSelectedMeter1(target.value)}
                    >
                      {filteredMeterList1.map((meter, index) => (
                        <option value={meter.value} key={meter.value}>
                          {meter.label}
                        </option>
                      ))}
                    </CustomInput>
                  </Form>
                </FormGroup>
              </Col>
            </Row>
            <Row form>
              <Col xs={6} sm={3}>
                <FormGroup className="form-group">
                  <Label className={labelClasses} for="space">
                    {t('Space')}2
                  </Label>
                  <br />
                  <Cascader
                    options={cascaderOptions}
                    onChange={onSpaceCascaderChange2}
                    changeOnSelect
                    expandTrigger="hover"
                  >
                    <Input value={selectedSpaceName2 || ''} readOnly />
                  </Cascader>
                </FormGroup>
              </Col>
              <Col xs="auto">
                <FormGroup>
                  <Label className={labelClasses} for="meterSelect2">
                    {t('Meter')}2
                  </Label>

                  <Form inline>
                    <Input placeholder={t('Search')} bsSize="sm" onChange={onSearchMeter2} />
                    <CustomInput
                      type="select"
                      id="meterSelect2"
                      name="meterSelect2"
                      bsSize="sm"
                      onChange={({ target }) => setSelectedMeter2(target.value)}
                    >
                      {filteredMeterList2.map((meter, index) => (
                        <option value={meter.value} key={meter.value}>
                          {meter.label}
                        </option>
                      ))}
                    </CustomInput>
                  </Form>
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col xs="auto">
                <FormGroup>
                  <Label className={labelClasses} for="periodType">
                    {t('Period Types')}
                  </Label>
                  <CustomInput
                    type="select"
                    id="periodType"
                    name="periodType"
                    bsSize="sm"
                    defaultValue="daily"
                    onChange={({ target }) => setPeriodType(target.value)}
                  >
                    {periodTypeOptions.map((periodType, index) => (
                      <option value={periodType.value} key={periodType.value}>
                        {t(periodType.label)}
                      </option>
                    ))}
                  </CustomInput>
                </FormGroup>
              </Col>

              <Col xs={6} sm={3}>
                <FormGroup className="form-group">
                  <Label className={labelClasses} for="reportingPeriodDateRangePicker">
                    {t('Reporting Period')}
                  </Label>
                  <br />
                  <DateRangePickerWrapper
                    id="reportingPeriodDateRangePicker"
                    format="yyyy-MM-dd HH:mm:ss"
                    value={reportingPeriodDateRange}
                    onChange={onReportingPeriodChange}
                    size="sm"
                    style={dateRangePickerStyle}
                    onClean={onReportingPeriodClean}
                    locale={dateRangePickerLocale}
                    placeholder={t('Select Date Range')}
                  />
                </FormGroup>
              </Col>
              <Col xs="auto">
                <FormGroup>
                  <br />
                  <ButtonGroup id="submit">
                    <Button size="sm" color="success" disabled={submitButtonDisabled}>
                      {t('Submit')}
                    </Button>
                  </ButtonGroup>
                </FormGroup>
              </Col>
              <Col xs="auto">
                <FormGroup>
                  <br />
                  <Spinner color="primary" hidden={spinnerHidden} />
                </FormGroup>
              </Col>
              <Col xs="auto">
                <br />
                <ButtonIcon
                  icon="external-link-alt"
                  transform="shrink-3 down-2"
                  color="falcon-default"
                  size="sm"
                  hidden={exportButtonHidden}
                  onClick={handleExport}
                >
                  {t('Export')}
                </ButtonIcon>
              </Col>
            </Row>
          </Form>
        </CardBody>
      </Card>
      <div style={{ visibility: resultDataHidden ? 'visible' : 'hidden', display: resultDataHidden ? '' : 'none' }}>
        <img className="img-fluid" src={blankPage} alt="" />
      </div>
      <div style={{ visibility: resultDataHidden ? 'hidden' : 'visible', display: resultDataHidden ? 'none' : '' }}>
        <div className="card-deck">
          <CardSummary
            id="cardSummary1"
            title={t('METER CATEGORY VALUE UNIT', {
              METER: meter1['name'],
              CATEGORY: meter1['energy_category_name'],
              UNIT: '(' + meter1['unit_of_measure'] + ')'
            })}
            color="success"
          >
            <CountUp
              end={reportingPeriodEnergyConsumptionInCategory1}
              duration={2}
              prefix=""
              separator=","
              decimals={2}
              decimal="."
            />
          </CardSummary>
          <CardSummary
            id="cardSummary2"
            title={t('METER CATEGORY VALUE UNIT', {
              METER: meter2['name'],
              CATEGORY: meter2['energy_category_name'],
              UNIT: '(' + meter2['unit_of_measure'] + ')'
            })}
            color="success"
          >
            <CountUp
              end={reportingPeriodEnergyConsumptionInCategory2}
              duration={2}
              prefix=""
              separator=","
              decimals={2}
              decimal="."
            />
          </CardSummary>
          <CardSummary
            id="cardSummary2"
            title={t('Reporting Period Difference CATEGORY UNIT', {
              CATEGORY: meter1['energy_category_name'],
              UNIT: '(' + meter1['unit_of_measure'] + ')'
            })}
            color="success"
          >
            <CountUp
              end={reportingPeriodEnergyConsumptionInDifference}
              duration={2}
              prefix=""
              separator=","
              decimals={2}
              decimal="."
            />
          </CardSummary>
        </div>

        <MultiTrendChart
          baseTitle={{
            name: 'METER CATEGORY VALUE UNIT',
            substitute: ['METER', 'CATEGORY', 'VALUE', 'UNIT'],
            METER: { a0: meter1['name'] },
            CATEGORY: { a0: meter1['energy_category_name'] },
            VALUE: { a0: reportingPeriodEnergyConsumptionInCategory1.toFixed(2) },
            UNIT: { a0: '(' + meter1['unit_of_measure'] + ')' }
          }}
          reportingTitle={{
            name: 'METER CATEGORY VALUE UNIT',
            substitute: ['METER', 'CATEGORY', 'VALUE', 'UNIT'],
            METER: { a0: meter2['name'] },
            CATEGORY: { a0: meter2['energy_category_name'] },
            VALUE: { a0: reportingPeriodEnergyConsumptionInCategory2.toFixed(2) },
            UNIT: { a0: '(' + meter2['unit_of_measure'] + ')' }
          }}
          baseTooltipTitle={{
            name: 'METER CATEGORY VALUE UNIT',
            substitute: ['METER', 'CATEGORY', 'VALUE', 'UNIT'],
            METER: { a0: meter1['name'] },
            CATEGORY: { a0: meter1['energy_category_name'] },
            VALUE: null,
            UNIT: { a0: '(' + meter1['unit_of_measure'] + ')' }
          }}
          reportingTooltipTitle={{
            name: 'METER CATEGORY VALUE UNIT',
            substitute: ['METER', 'CATEGORY', 'VALUE', 'UNIT'],
            METER: { a0: meter2['name'] },
            CATEGORY: { a0: meter2['energy_category_name'] },
            VALUE: null,
            UNIT: { a0: '(' + meter2['unit_of_measure'] + ')' }
          }}
          baseLabels={meterLineChartLabels1}
          baseData={meterLineChartData1}
          reportingLabels={meterLineChartLabels2}
          reportingData={meterLineChartData2}
          rates={{ a0: [] }}
        />

        <MultipleLineChart
          reportingTitle={t('Operating Characteristic Curve')}
          baseTitle=""
          labels={parameterLineChartLabels}
          data={parameterLineChartData}
          options={parameterLineChartOptions}
        />
        <br />
        <DetailedDataTable
          data={detailedDataTableData}
          title={t('Detailed Data')}
          columns={detailedDataTableColumns}
          pagesize={50}
        />
      </div>
    </Fragment>
  );
};

export default withTranslation()(withRedirect(MeterComparison));
