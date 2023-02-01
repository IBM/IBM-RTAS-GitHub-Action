const core = require('@actions/core');
const urlencode = require("urlencode");
const path = require("path");
const url = require("url");
const axios = require("axios");

var datasetSrcId;
var datasetReplaceId;
var secretsCollectionId;
const Status = {
    COMPLETE: 'COMPLETE',
    COMPLETE_WITH_ERROR: 'COMPLETE_WITH_ERROR',
    STOPPED_BY_USER: 'STOPPED_BY_USER',
    STOPPED_AUTOMATICALLY: 'STOPPED_AUTOMATICALLY',
    INCOMPLETE: 'INCOMPLETE',
    RUNNING: 'RUNNING',
    IN_TRANSITION: 'IN_TRANSITION',
    SCHEDULED: 'SCHEDULED',
    CANCELED: 'CANCELED',
    LAUNCH_FAILED: 'LAUNCH_FAILED',
    STOPPING: 'STOPPING'
};

const serverStore = {
    serverUrl: '',
    offlineToken: '',
    accessToken: '',

    set setServerUrl(serverUrl) {
        this.serverUrl = serverUrl;
    },
    get getServerUrl() {
        return this.serverUrl;
    },

    set setOfflineToken(offlineToken) {
        this.offlineToken = offlineToken;
    },
    get getOfflineToken() {
        return this.offlineToken;
    },

    set setAccessToken(accessToken) {
        this.accessToken = accessToken;
    },
    get getAccessToken() {
        return this.accessToken;
    }
};
const asset = {
    teamspace: '',
    project: '',
    branch: '',
    environment: '',
    variables: '',
    datasets: '',
    tags: '',
    secretsCollection: '',
    startDate: '',
    projectId: '',
    teamspaceId: '',
    assetId: '',
    externalType: '',
    assetName: '',
    desktopProjectId: '',
    executionId: '',
    resultId: '',
    execStatus: '',
    verdictSet: '',
    secretId: '',

    set setTeamspace(teamspace) {
        this.teamspace = teamspace;
    },
    get getTeamspace() {
        return this.teamspace;
    },

    set setProject(project) {
        this.project = project;
    },
    get getProject() {
        return this.project;
    },

    set setBranch(branch) {
        this.branch = branch;
    },
    get getBranch() {
        return this.branch;
    },

    set setEnvironment(environment) {
        this.environment = environment;
    },
    get getEnvironment() {
        return this.environment;
    },

    set setProjectId(projectId) {
        this.projectId = projectId;
    },
    get getProjectId() {
        return this.projectId;
    },

    set setTeamspaceId(teamspaceId) {
        this.teamspaceId = teamspaceId;
    },
    get getTeamSpaceId() {
        return this.teamspaceId;
    },

    set setAssetId(assetId) {
        this.assetId = assetId;
    },
    get getAssetId() {
        return this.assetId;
    },

    set setExternalType(externalType) {
        this.externalType = externalType;
    },
    get getExternalType() {
        return this.externalType;
    },

    set setAssetName(assetName) {
        this.assetName = assetName;
    },
    get getAssetName() {
        return this.assetName;
    },

    set setDesktopProjectId(desktopProjectId) {
        this.desktopProjectId = desktopProjectId;
    },
    get getDesktopProjectId() {
        return this.desktopProjectId;
    },

    set setExecutionId(executionId) {
        this.executionId = executionId;
    },
    get getExecutionId() {
        return this.executionId;
    },

    set setResultId(resultId) {
        this.resultId = resultId;
    },
    get getResultId() {
        return this.resultId;
    },

    set setExecStatus(execStatus) {
        this.execStatus = execStatus;
    },
    get getExecStatus() {
        return this.execStatus;
    },

    set setVerdictSet(verdictSet) {
        this.verdictSet = verdictSet;
    },
    get getVerdictSet() {
        return this.verdictSet;
    },

    set setSecretId(secretId) {
        this.secretId = secretId;
    },
    get getSecretId() {
        return this.secretId;
    },

    set setVariables(variables) {
        this.variables = variables;
    },
    get getVariables() {
        return this.variables;
    },

    set setDatasets(datasets) {
        this.datasets = datasets;
    },
    get getDatasets() {
        return this.datasets;
    },

    set setTags(tags) {
        this.tags = tags;
    },
    get getTags() {
        return this.tags;
    },

    set setSecretsCollection(secretsCollection) {
        this.secretsCollection = secretsCollection;
    },
    get getSecretsCollection() {
        return this.secretsCollection;
    },

    set setStartDate(startDate) {
        this.startDate = startDate;
    },
    get getStartDate() {
        return this.startDate;
    }
};



const main = async () => {
    try {
        /**
         * We need to fetch all the inputs that were provided to our action
         * and store them in variables for us to use.
         **/
        var serverUrl = core.getInput('serverUrl', { required: true });
        serverUrl += serverUrl.endsWith("/") ? "" : "/";
        serverStore.setServerUrl = serverUrl;
        const offlineToken = core.getInput('offlineToken', { required: true });
        serverStore.setOfflineToken = offlineToken;
        const teamspace = core.getInput('teamspace', { required: true });
        asset.setTeamspace = teamspace;
        const project = core.getInput('project', { required: true });
        asset.setProject = project;
        const branch = core.getInput('branch', { required: true });
        asset.setBranch = branch;
		const assetId = core.getInput('assetId', { required: true });
        asset.setAssetId = assetId;
        const environment = core.getInput('environment', { required: false });
        asset.setEnvironment = environment;
        const datasets = core.getInput('datasets', { required: false });
        asset.setDatasets = datasets;
		
		const variables = core.getInput('variables', { required: false });
        asset.setVariables = variables;
		const tags = core.getInput('labels', { required: false });
        asset.setTags = tags;
		const secretsCollection = core.getInput('secretsCollection', { required: false });
        asset.setSecretsCollection = secretsCollection;

        await serverSSLCheck(serverStore);

        await teamspaceIdGenByName(serverStore, asset);

        await projectIdGenByName(serverStore, asset);

        await branchValidation(serverStore, asset);
        
        await validateAssetId(serverStore, asset);

        if (
            asset.getExternalType == "APISUITE" ||
            asset.getExternalType == "APITEST" ||
            asset.getExternalType == "APISTUB" ||
            asset.getExternalType == "EXT_TEST_PMAN"
        ) {
            await validateEnvironment(serverStore, asset);
        }
        await startJobExecution(serverStore, asset);

        if (
            asset.getExecStatus != Status.COMPLETE ||
            asset.getExecStatus != Status.COMPLETE_WITH_ERROR ||
            asset.getExecStatus != Status.STOPPED_BY_USER ||
            asset.getExecStatus != Status.STOPPED_AUTOMATICALLY ||
            asset.getExecStatus != Status.INCOMPLETE ||
            asset.getExecStatus != Status.CANCELED ||
            asset.getExecStatus != Status.LAUNCH_FAILED
        ) {

            await pollJobStatus(serverStore, asset);
        }

        await getResults(serverStore, asset);
        if (asset.getVerdictSet == false) {
            core.setFailed("Execution failed, Test Execution Status:  " + asset.getExecStatus);
        }

    } catch (error) {
        console.log("Execution failed with error " + error.message);
        core.setFailed(error.message);
    }
}

function isEmptyOrSpaces(input) {
     return !input || !input.trim();
}

async function validateAssetId(serverStore, asset) {
  var encodedAssetId = urlencode(asset.getAssetId);
  var encodedBranchName = urlencode(asset.getBranch);
  var testsListURL =
    serverStore.getServerUrl +
    "rest/projects/" +
    asset.getProjectId +
    "/assets/?assetTypes=EXECUTABLE&assetIds=" +
    encodedAssetId +
    "&revision=" +
    encodedBranchName +
    "&deployable=true";

  await accessTokenGen(serverStore);

  var headers = {
    "Accept-Language": "en",
    Authorization: "Bearer " + serverStore.getAccessToken,
  };
  return axios
    .get(testsListURL, { headers: headers })
    .then((response) => {
      if (response.status != 200) {
        throw new Error(
          "Error during retrieval of testassets. " +
          testsListURL +
          " returned " +
          response.status +
          " response code. Response: " +
          response.data
        );
      }
      var parsedJSON = response.data;
      var total = parsedJSON.totalElements;
      var retrievedAssetId;
      var gotId = false;
      if (total > 0) {
        for (var i = 0; i < total; i++) {
          retrievedAssetId = parsedJSON.content[i].id;
          if (
            retrievedAssetId == asset.getAssetId 
          ) {
            asset.setExternalType = parsedJSON.content[i].external_type;
            asset.setDesktopProjectId = parsedJSON.content[i].desktop_project_id;
            gotId = true;
            return true;
          }
        }
        if (!gotId) {
          throw new Error(
            "The AssetId " +
            asset.getAssetId +
            " was not found in the branch " +
            asset.getBranch +
            " in the project " +
            asset.getProject +
            ". Please check the AssetId field in the task."
          );
        }
      } else {
        throw new Error(
          "The AssetId " +
          asset.getAssetId +
          " was not found in the branch " +
          asset.getBranch +
          " in the project " +
          asset.getProject +
          ". Please check the AssetId field in the task."
        );
      }
    })
    .catch((error) => {
      throw new Error(
        "Error when accessing testassets API - " +
        testsListURL +
        ". Error: " +
        error
      );
    });
}

async function validateEnvironment(serverStore, asset) {
    if (asset.getEnvironment == "" || asset.getEnvironment == null || asset.getEnvironment == undefined) {
        throw new Error(
            "Test Environment is mandatory to run API test. Please input the value in the API Test Environment field in the task."
        );
    }

    var encodedBranchName = urlencode(asset.getBranch);

    var envListURL =
        serverStore.getServerUrl +
        "rest/projects/" +
        asset.getProjectId +
        "/assets/?assetTypes=environment&revision=" +
        encodedBranchName +
        "&desktopProjectId=" +
        asset.getDesktopProjectId;

    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    return axios
        .get(envListURL, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of environments list. " +
                    envListURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var total = parsedJSON.totalElements;
            var RetrievedEnvName;
            var gotEnv = false;
            if (total > 0) {
                for (var i = 0; i < total; i++) {
                    RetrievedEnvName = parsedJSON.content[i].name;
                    if (asset.getEnvironment == RetrievedEnvName) {
                        gotEnv = true;
                        return true;
                    }
                }
                if (gotEnv == false) {
                    throw new Error(
                        "The test environment " +
                        asset.getEnvironment +
                        " is not valid for the test. Please check the API Test Environment field in the task."
                    );
                }
            } else {
                throw new Error(
                    "Test Environments unavailable for the test execution."
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing environments list URL - " +
                envListURL +
                ". Error: " +
                error
            );
        });
}

async function getResults(serverStore, asset) {
    var resultsURL =
        serverStore.getServerUrl +
        "rest/projects/" +
        asset.getProjectId +
        "/results/" +
        asset.getResultId;

    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    return axios
        .get(resultsURL, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of results. " +
                    resultsURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var verdict = parsedJSON.verdict;
            console.log("");
            console.log("Test Result = " + verdict);
            if (verdict == "ERROR" || verdict == "FAIL") {
                asset.setVerdictSet = false;
                var message = parsedJSON.message;
                console.log("");
                console.log("Error Message = " + message);
            } else {
                asset.setVerdictSet = true;
            }

            if (
                asset.getExecStatus != 'CANCELED' &&
                asset.getExecStatus != 'LAUNCH_FAILED'
            ) {
                var total = parsedJSON.reports.length;

                if (total > 0) {
                    console.log("Reports information:");
                    for (var i = 0; i < total; i++) {
                        let reportName = parsedJSON.reports[i].name;
                        let reporthref = parsedJSON.reports[i].href;
                        console.log(
                            reportName +
                            " : " +
                            url.resolve(serverStore.getServerUrl, reporthref)
                        );
                    }
                } else {
                    console.log("Reports unavailable.");
                }
            }
            return true;
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing results URL - " + resultsURL + ". Error: " + error
            );
        });
}


async function getJobStatus(serverStore, asset) {
    var jobStatusURL =
        serverStore.getServerUrl +
        "rest/projects/" +
        asset.getProjectId +
        "/executions/" +
        asset.getExecutionId;

    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    var status;
    return axios
        .get(jobStatusURL, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of test execution status. " +
                    jobStatusURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            status = parsedJSON.status;

            if (asset.getExecStatus != status) {
                asset.setExecStatus = status;
                console.log(
                    " Test Execution Status: " + asset.getExecStatus
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing test execution status URL - " +
                jobStatusURL +
                ". Error: " +
                error
            );
        });
}

async function pollJobStatus(serverStore, asset) {
    return new Promise((resolve, reject) => {
        var timerId = setInterval(async function () {
            try {
                await getJobStatus(serverStore, asset);

                if (
                    asset.getExecStatus == Status.COMPLETE ||
                    asset.getExecStatus == Status.COMPLETE_WITH_ERROR ||
                    asset.getExecStatus == Status.STOPPED_BY_USER ||
                    asset.getExecStatus == Status.STOPPED_AUTOMATICALLY ||
                    asset.getExecStatus == Status.INCOMPLETE ||
                    asset.getExecStatus == Status.CANCELED ||
                    asset.getExecStatus == Status.LAUNCH_FAILED
                ) {
                    // stop polling on end state
                    clearInterval(timerId);
                    resolve(true);
                }
                // continue polling...
            } catch (error) {
                // stop polling on any error
                clearInterval(timerId);
                reject(error);
            }
        }, 11000);
    });
}


async function startJobExecution(serverStore, asset) {
    let jobExecURL =
        serverStore.getServerUrl +
        "rest/projects/" +
        asset.getProjectId +
        "/executions/";
    var AssetParameters = {
        testAsset: {
            assetId: asset.getAssetId,
            revision: asset.getBranch,
        },
        offlineToken: serverStore.getOfflineToken,
    };

    if (
        asset.getExternalType == "APISUITE" ||
        asset.getExternalType == "APITEST" ||
        asset.getExternalType == "APISTUB" ||
        asset.getExternalType == "EXT_TEST_PMAN"
    ) {
        AssetParameters["environment"] = asset.getEnvironment;
    }

    if (asset.getVariables) {
        var str_array = asset.getVariables.split(';');
        var varObj = {};
        var keyval;
        var key;
        for (var i = 0; i < str_array.length; i++) {
            keyval = str_array[i].split('=');
            key = keyval[0];
            varObj[key] = keyval[1];
        }
        AssetParameters["variables"] = varObj;
    }

    if (asset.getStartDate) {
        const event = new Date(asset.getStartDate);
        var at = { at: event.toISOString() };
        AssetParameters["scheduled"] = at;
    }

    if (asset.getDatasets) {
        var dataSources = [];
        var sources;
        var str_array = asset.getDatasets.split(';');
        for (var i = 0; i < str_array.length; i++) {
            var datasetArray = str_array[i].split(':');
            await getSrcDataSetId(serverStore, asset, datasetArray[0]);
            await getReplaceDataSetId(serverStore, asset, datasetSrcId, datasetArray[1]);
            sources = {
                "source": {
                    "assetId": datasetSrcId
                },
                "replacement": {
                    "datasetId": datasetReplaceId
                }
            }
            dataSources.push(sources);
        }


        AssetParameters["dataSources"] = dataSources;
    }

    if (asset.getTags) {
        var tag = asset.getTags.split(',');
        AssetParameters["tags"] = tag;
    }

    if (asset.getSecretsCollection) {
        await getSecretCollectionId(serverStore, asset);
        AssetParameters["secretsCollection"] = secretsCollectionId;
    }

    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        "Content-Type": "application/json",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    var body = JSON.stringify(AssetParameters);
    console.log("request body = " + body);
    return axios
        .post(jobExecURL, body, { headers: headers })
        .then((response) => {
            if (response.status != 201) {
                throw new Error(
                    "Error during launch of test. " +
                    jobExecURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            asset.setExecutionId = parsedJSON.id;
            asset.setResultId = parsedJSON.result.id;
            asset.setExecStatus = parsedJSON.status;
            console.log(
                " Test Execution Status: " + asset.getExecStatus
            );
            return true;
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing test execution URL - " +
                jobExecURL +
                ". Error: " +
                error
            );
        });
}

async function branchValidation(serverStore, asset) {
    let branchListURL =
        serverStore.getServerUrl +
        "rest/projects/" +
        asset.getProjectId +
        "/branches/";

    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    return axios
        .get(branchListURL, { headers: headers })
        .then((response) => {

            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of branches. " +
                    branchListURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var total = parsedJSON.totalElements;
            var RetrievedBranchName;
            var gotBranch = false;
            if (total > 0) {
                for (var i = 0; i < total; i++) {
                    RetrievedBranchName = parsedJSON.content[i].name;
                    if (asset.getBranch == RetrievedBranchName) {
                        gotBranch = true;
                        return true;
                    }
                }
                if (gotBranch == false) {
                    throw new Error(
                        "The branch " +
                        asset.getBranch +
                        " was not found in the project " +
                        asset.getProject +
                        ". Please check the Branch field in the task."
                    );
                }
            } else {
                throw new Error(
                    "The branch " +
                    asset.getBranch +
                    " was not found in the project " +
                    asset.getProject +
                    ". Please check the Branch field in the task."
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing branch list API - " +
                branchListURL +
                ". Error: " +
                error
            );
        });
}

async function projectIdGenByName(serverStore, asset) {
    let encodedProjName = urlencode(asset.getProject);
    let projectsListURL =
        serverStore.getServerUrl +
        "rest/projects?archived=false&member=true&name=" +
        encodedProjName;
    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
        spaceId: asset.getTeamSpaceId,
    };
    return axios
        .get(projectsListURL, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of projects. " +
                    projectsListURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var total = parsedJSON.total;
            var retrievedProjName;
            var gotId = false;
            if (total > 0) {
                for (var i = 0; i < total; i++) {
                    retrievedProjName = parsedJSON.data[i].name;
                    if (asset.getProject == retrievedProjName) {
                        asset.setProjectId = parsedJSON.data[i].id;
                        gotId = true;
                        return true;
                    }
                }
                if (!gotId) {
                    throw new Error(
                        "You do not have access to the project " +
                        asset.getProject +
                        " or the project was not found in the teamspace " +
                        asset.getTeamspace +
                        " in the server. Please check the Project field in the task."
                    );
                }
            } else {
                throw new Error(
                    "You do not have access to the project " +
                    asset.getProject +
                    " or the project was not found in the teamspace " +
                    asset.getTeamspace +
                    " in the server. Please check the Project field in the task."
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing projects list API - " +
                projectsListURL +
                ". Error: " +
                error
            );
        });
}
function serverSSLCheck(serverStore) {
    var sslCheckUrl = serverStore.getServerUrl;
    return axios
        .get(sslCheckUrl)
        .then((response) => {
            return true;
        })
        .catch((error) => {
            if (error.code == "ENOTFOUND") {
                throw new Error(
                    "Cannot resolve the host. Please check the server URL and connectivity to the server."
                );
            } else if (error.code == "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
                throw new Error(
                    "Could not establish secure connection to the server " +
                    serverStore.getServerUrl +
                    ". Please validate the SSL certificate of the server or import the CA certificate of the server to your trust store. Error: " +
                    error.message
                );
            } else if (error.code == "CERT_HAS_EXPIRED") {
                throw new Error(
                    "Could not establish secure connection to the server " +
                    serverStore.getServerUrl +
                    ". The server presented an expired SSL certificate. Error: " +
                    error.message
                );
            } else {
                throw new Error(
                    "Could not establish secure connection to the server " +
                    serverStore.getServerUrl +
                    ". Error: " +
                    error.message
                );
            }
        });
}

function accessTokenGen(serverStore) {
    var tokenURL = serverStore.getServerUrl + "rest/tokens/";
    var body = "refresh_token=" + serverStore.getOfflineToken;
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    };

    return axios
        .post(tokenURL, body, {
            headers: headers,
        })
        .then((response) => {
            if (
                response.status == 400 ||
                response.status == 401 ||
                response.status == 402
            ) {
                throw new Error(
                    "Error during retrieval of access token. Please check the offline token in the service connection. Request returned response code: " +
                    response.status
                );
            }
            if (response.status == 403) {
                throw new Error(
                    "Error during retrieval of access token. Please check the license as request is unauthorized. Request returned response code: " +
                    response.status
                );
            }
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of access token. Request returned response code: " +
                    response.status
                );
            }
            serverStore.setAccessToken = response.data.access_token;
            return response.data;
        })
        .catch((error) => {
            if (error.code == "ENOTFOUND") {
                throw new Error(
                    "Cannot resolve the host. Please check the server URL and connectivity to the server."
                );
            } else if (error.code == "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
                throw new Error(
                    "Could not establish secure connection to the server " +
                    serverStore.getServerUrl +
                    ". Please validate the SSL certificate of the server or import the CA certificate of the server to your trust store. Error: " +
                    error.message
                );
            } else if (error.code == "CERT_HAS_EXPIRED") {
                throw new Error(
                    "Could not establish secure connection to the server " +
                    serverStore.getServerUrl +
                    +
                    ". The server presented an expired SSL certificate. Error: " +
                    error.message
                );
            } else {
                throw new Error(
                    "Error when accessing Token management URL: " +
                    tokenURL +
                    " Error: " +
                    error
                );
            }
        });
}

async function teamspaceIdGenByName(serverStore, asset) {
    let encodedTeamspaceName = urlencode(asset.getTeamspace);
    let teamspacesListURL =
        serverStore.getServerUrl +
        "rest/spaces?search=" +
        encodedTeamspaceName +
        "&member=true";

    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    return axios
        .get(teamspacesListURL, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of teamspaces. " +
                    teamspacesListURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var retrievedTeamSpaceName;
            var gotId = false;
            var total = parsedJSON.length;
            if (total > 0) {
                for (var i = 0; i < total; i++) {
                    retrievedTeamSpaceName = parsedJSON[i].displayName;
                    if (asset.getTeamspace == retrievedTeamSpaceName) {
                        asset.setTeamspaceId = parsedJSON[i].id;
                        gotId = true;
                        return;
                    }
                }
                if (!gotId) {
                    throw new Error(
                        "You do not have access to the team space " +
                        asset.getTeamspace +
                        " or the team space was not found in the server. Please check the Team Space field in the task."
                    );
                }
            } else {
                throw new Error(
                    "You do not have access to the team space " +
                    asset.getTeamspace +
                    +
                    " or the team space was not found in the server. Please check the Team Space field in the task."
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing teamspaces list API - " +
                teamspacesListURL +
                ". Error: " +
                error
            );
        });
}

async function getSrcDataSetId(serverStore, asset, srcDataSet) {
    let datasetURL = serverStore.getServerUrl + "rest/projects/" + asset.getProjectId + "/assets/" + asset.getAssetId + "/" + asset.getBranch + "/dependencies/?assetTypes=dataset";
    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    return axios
        .get(datasetURL, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of Source data set ID. " +
                    datasetURL +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var total = parsedJSON.totalElements;
            var retrievedDatasetName;
            var gotId = false;
            if (total > 0) {
                for (var i = 0; i < total; i++) {

                    retrievedDatasetName = parsedJSON.content[i].path;
                    if (srcDataSet == retrievedDatasetName) {
                        datasetSrcId = parsedJSON.content[i].id;
                        gotId = true;
                        return true;
                    }
                }
                if (!gotId) {
                    throw new Error(
                        "No Dataset configured for the Asset"
                    );
                }
            } else {
                throw new Error(
                    "No Dataset configured for the Asset"
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing DataSet API - " +
                datasetURL +
                ". Error: " +
                error
            );
        });
}

async function getReplaceDataSetId(serverStore, asset, srcDataSetId, repDataset) {
    let repDataUrl = serverStore.getServerUrl + "rest/projects/" + asset.getProjectId + "/datasets/?branch=" + asset.getBranch + "&assetId=" + srcDataSetId + "&findSwaps=true";
    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    return axios
        .get(repDataUrl, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of Source data set ID. " +
                    repDataUrl +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var total = parsedJSON.data.length;
            var retrievedDatasetName;
            var gotId = false;
            if (total > 0) {
                for (var i = 0; i < total; i++) {
                    retrievedDatasetName = parsedJSON.data[i].displayPath;
                    if (repDataset == retrievedDatasetName) {
                        datasetReplaceId = parsedJSON.data[i].datasetId;
                        gotId = true;
                        return true;
                    }
                }
                if (!gotId) {
                    throw new Error(
                        "No Swap configured for the DataSets"
                    );
                }
            } else {
                throw new Error(
                    "No Swap configured for the DataSets"
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing DataSet Swap API - " +
                repDataUrl +
                ". Error: " +
                error
            );
        });
}

async function getSecretCollectionId(serverStore, asset) {

    let secretUrl = serverStore.getServerUrl + "rest/projects/" + asset.getProjectId + "/secrets/?type=ENVIRONMENT";
    await accessTokenGen(serverStore);

    var headers = {
        "Accept-Language": "en",
        Authorization: "Bearer " + serverStore.getAccessToken,
    };
    return axios
        .get(secretUrl, { headers: headers })
        .then((response) => {
            if (response.status != 200) {
                throw new Error(
                    "Error during retrieval of Secret Collection ID. " +
                    secretUrl +
                    " returned " +
                    response.status +
                    " response code. Response: " +
                    response.data
                );
            }
            var parsedJSON = response.data;
            var total = parsedJSON.data.length;
            var retsecretCollectionName;
            var gotId = false;
            if (total > 0) {
                for (var i = 0; i < total; i++) {
                    var respData = parsedJSON.data[i];
                    retsecretCollectionName = respData.name;
                    if (asset.getSecretsCollection == retsecretCollectionName) {
                        secretsCollectionId = respData.id;

                        gotId = true;
                        return true;
                    }
                }
                if (!gotId) {
                    throw new Error(
                        "Secret collection does not available on server."
                    );
                }
            } else {
                throw new Error(
                    "No Secret configured."
                );
            }
        })
        .catch((error) => {
            throw new Error(
                "Error when accessing Secret Collection API - " +
                secretUrl +
                ". Error: " +
                error
            );
        });
}

// Call the main function to run the action
main();
