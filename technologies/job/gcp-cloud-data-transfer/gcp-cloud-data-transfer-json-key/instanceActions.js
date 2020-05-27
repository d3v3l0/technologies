const axios = require('axios');
const { Response, JobStatus, Log } = require('@saagie/sdk');
const util = require('util')
const moment = require('moment');
const { google } = require('googleapis');
const { Storage } = require('@google-cloud/storage');

// Instantiate a storagetransfer client
const storagetransfer = google.storagetransfer('v1');

/**
 * Logic to start the external job instance.
 * @param {Object} params
 * @param {Object} params.job - Contains job data including featuresValues.
 * @param {Object} params.instance - Contains instance data.
 */
exports.start = async ({ job, instance }) => {
  try {
    // -----------------------
    // ------ DEBUG ----------
    // -----------------------
    console.log('START instance:', instance);
    // -----------------------
    // ------ DEBUG ----------
    // -----------------------

    if (job.featuresValues === undefined || job.featuresValues.action === undefined) {
      // -----------------------
      // ------ DEBUG ----------
      // -----------------------
      console.log('You need to pick an action');
      // -----------------------
      // ------ DEBUG ----------
      // -----------------------
      return Response.success('You need to pick an action');
    }

    if (job.featuresValues === undefined || job.featuresValues.endpoint === undefined || job.featuresValues.endpoint.jsonKey === undefined) {
      // -----------------------
      // ------ DEBUG ----------
      // -----------------------
      console.log('You need to provide a JSON key');
      // -----------------------
      // ------ DEBUG ----------
      // -----------------------
      return Response.success('You need to provide a JSON key');
    }
    const gcpKey = JSON.parse(job.featuresValues.endpoint.jsonKey);

    // -----------------------
    // ------ DEBUG ----------
    // -----------------------
    console.log('-------------------------------------------------------------------------')
    console.log('START job:', util.inspect(job, false, null, true /* enable colors */))
    console.log('job.featuresValues.endpoint.sourceBucket: %s', job.featuresValues.endpoint.sourceBucket);
    console.log('-------------------------------------------------------------------------')
    // -----------------------
    // ------ DEBUG ----------
    // -----------------------

    createTransferJob(
      {
        projectID: gcpKey.project_id,
        srcBucket: job.featuresValues.endpoint.sourceBucket,
        destBucket: job.featuresValues.endpoint.destinationBucket,
        time: job.featuresValues.endpoint.transferTime,
        date: job.featuresValues.endpoint.transferDate,
        description: job.featuresValues.endpoint.description,
        jsonKey: job.featuresValues.endpoint.jsonKey,
      },
      Response
    );
    // You can return any payload you want to get in the stop and getStatus functions.
    // return Response.success({ customId: job.featuresValues.action.id });
  } catch (error) {
    console.log(error);
    return Response.error('Failed to start job');
  }
};

/**
 * Logic to stop the external job instance.
 * @param {Object} params
 * @param {Object} params.job - Contains job data including featuresValues.
 * @param {Object} params.instance - Contains instance data including the payload returned in the start function.
 */
exports.stop = async ({ job, instance }) => {
  try {
    console.log('STOP INSTANCE:', instance);
    console.log('STOP job:', util.inspect(job, false, null, true /* enable colors */))

    return Response.success();
  } catch (error) {
    return Response.error('Failed to stop job', { error });
  }
};

/**
 * Logic to retrieve the external job instance status.
 * @param {Object} params
 * @param {Object} params.job - Contains job data including featuresValues.
 * @param {Object} params.instance - Contains instance data including the payload returned in the start function.
 */
exports.getStatus = async ({ job, instance }) => {
  try {
    console.log('STATUS INSTANCE:', instance);
    console.log('STATUS job:', util.inspect(job, false, null, true /* enable colors */))

    switch (data.status) {
      case 'IN_PROGRESS':
        return Response.success(JobStatus.RUNNING);
      case 'STOPPED':
        return Response.success(JobStatus.KILLED);
      default:
        return Response.success(JobStatus.AWAITING);
    }
  } catch (error) {
    return Response.error('Failed to get status', { error });
  }
};

/**
 * Logic to retrieve the external job instance logs.
 * @param {Object} params
 * @param {Object} params.job - Contains job data including featuresValues.
 * @param {Object} params.instance - Contains instance data including the payload returned in the start function.
 */
exports.getLogs = async ({ job, instance }) => {
  try {
    console.log('LOG INSTANCE:', instance);
    console.log('LOG job:', util.inspect(job, false, null, true /* enable colors */))

    return Response.success('Success!');
    // return Response.success(data.logs.map((item) => Log(item.log, item.output)));
  } catch (error) {
    return Response.error('Failed to get log', { error });
  }
};

/**
 * Review the transfer operations associated with a transfer job.
 *
 * @param {object} options Configuration options.
 * @param {string} options.projectID The ID of the project.
 * @param {string} options.srcBucket The name of the source bucket.
 * @param {string} options.destBucket The name of the destination bucket.
 * @param {string} options.date The date of the first transfer in the format YYYY/MM/DD.
 * @param {string} options.time The time of the first transfer in the format HH:MM.
 * @param {string} [options.description] Optional. Description for the new transfer job.
 * @param {function} callback The callback function.
 */
const createTransferJob = (options, Response) => {
  // -----------------------
  // ------ DEBUG ----------
  // -----------------------
  console.log('-------------------------------------------------------------------------')
  console.log('Entering createTransferJob');
  console.log('Content of options:');
  console.log(util.inspect(options, false, null, true /* enable colors */))
  console.log('-------------------------------------------------------------------------')
  // -----------------------
  // ------ DEBUG ----------
  // -----------------------

  const startDate = moment(options.date, 'YYYY/MM/DD');
  const transferTime = moment(options.time, 'HH:mm');

  const keys = JSON.parse(options.jsonKey);

  authClient = new google.auth.JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  // -----------------------
  // ------ DEBUG ----------
  // -----------------------
  console.log('-------------------------------------------------------------------------')
  console.log('Content of authClient:');
  console.log(util.inspect(authClient, false, null, true /* enable colors */))
  console.log('-------------------------------------------------------------------------')
  // -----------------------
  // ------ DEBUG ----------
  // -----------------------

  // Prepare the information needed to create a Transfer Job between GCS buckets
  const transferJob = {
    projectId: options.projectID,
    status: 'ENABLED',
    transferSpec: {
      gcsDataSource: { bucketName: options.srcBucket, },
      gcsDataSink: { bucketName: options.destBucket, },
      transferOptions: { deleteObjectsFromSourceAfterTransfer: false, },
    },
    schedule: {
      scheduleStartDate: {
        year: startDate.year(),
        month: startDate.month() + 1,
        day: startDate.date(),
      },
      startTimeOfDay: {
        hours: transferTime.hours(),
        minutes: transferTime.minutes(),
      },
    },
  };

  // -----------------------
  // ------ DEBUG ----------
  // -----------------------
  console.log('-------------------------------------------------------------------------')
  console.log('Content of transferJob:');
  console.log(util.inspect(transferJob, false, null, true /* enable colors */))
  console.log('-------------------------------------------------------------------------')
  // -----------------------
  // ------ DEBUG ----------
  // -----------------------

  if (options.description) {
    transferJob.description = options.description;
  }

  // -----------------------
  // ------ DEBUG ----------
  // -----------------------
  console.log('Before storagetransfer.transferJobs.create');

  // Get Bucket Metadata
  async function getMetadata() {
    storageOptions = {
      projectId: keys.project_id,
      credentials: {
        client_email: keys.client_email,
        private_key: keys.private_key
      }
    };

    // Create a client
    const storage = new Storage(storageOptions);

    // Gets the metadata for the bucket
    const [metadata] = await storage.bucket(options.srcBucket).getMetadata();
    console.log('------------------------')
    console.log('-- BUCKET INFORMATION --')
    console.log('------------------------')
    console.log(util.inspect(metadata, false, null, true /* enable colors */))
    console.log('----------------------------')
    console.log('-- END BUCKET INFORMATION --')
    console.log('----------------------------')
  }
  getMetadata().catch(console.error);
  // -----------------------
  // ------ DEBUG ----------
  // -----------------------


  async function getServiceAccount() {
    const request = {
      // Required. The ID of the Google Cloud Platform Console project that the
      // Google service account is associated with.
      // This is the service account used to schedule the transfer job and it MUST has access
      // to the GCS buckets.
      projectId: keys.project_id,
      auth: authClient,
    };
    const response = await storagetransfer.googleServiceAccounts.get(request);
    console.log('---------------------')
    console.log('-- SERVICE ACCOUNT --')
    console.log('---------------------')
    console.log('Make sure the following service account has access to the GCS Bucket(s)')
    console.log(response.data.accountEmail);
    console.log('-------------------------')
    console.log('-- END SERVICE ACCOUNT --')
    console.log('-------------------------')
  }
  getServiceAccount().catch(console.error);


  storagetransfer.transferJobs.create(
    {
      auth: authClient,
      resource: transferJob,
    },
    (err, response) => {
      // -----------------------
      // ------ DEBUG ----------
      // -----------------------
      console.log('Inside (err, response)');
      if (Response === undefined)
        console.log('Response is undefined');
      else
        console.log('Response is ok')
      // -----------------------
      // ------ DEBUG ----------
      // -----------------------

      if (err) {
        console.log("---------------");
        console.log("---- Error ----");
        console.log("---------------");
        console.log(err);
        return Response.error('Error:', { err });
      }

      const transferJob = response.data;
      console.log('Created transfer job: %s', transferJob.name);
      return Response.success('Created transfer job: %s', transferJob.name);
    }
  );
};