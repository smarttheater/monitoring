<?php
$config = [
    'API_STATUS_ENDPOINT' => $_SERVER['API_STATUS_ENDPOINT'],
    'API_CHECKPOINTDIFINITION_ENDPOINT' => $_SERVER['API_CHECKPOINTDIFINITION_ENDPOINT'],
    'API_TIMEOUT' => $_SERVER['API_TIMEOUT'],
    'VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY' => array_filter(array_map('trim', explode(',', $_SERVER['VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY']))),
    'VSTRSTAT_CHECKPOINT_TARGETWHERE_ARRAY' => array_filter(array_map('trim', explode(',', $_SERVER['VSTRSTAT_CHECKPOINT_TARGETWHERE_ARRAY'])))
];

header('content-type: application/json; charset=utf-8');
echo json_encode($config);
