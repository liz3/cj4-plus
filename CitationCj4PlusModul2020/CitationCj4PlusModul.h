// CitationCj4PlusModul.h : Include file for standard system include files,
// or project specific include files.

#pragma once

#include <MSFS/MSFS.h>

#include <MSFS/Legacy/gauges.h>
#include <MSFS/MSFS.h>
#include <SimConnect.h>
#include <iostream>
#include <map>
#include <string>

enum DATA_DEFINE_ID {
	DEFINITION_SIMVARS,
	DEFINITION_LVARS,
};

enum DATA_REQUEST_ID {
	REQUEST_FETCH_SIMVARS,
	REQUEST_FETCH_LVARS,
};

enum eEvents
{
	EVENT_FLIGHT_LOADED,
	EVENT_FRAME
};

struct State {
	HANDLE hSimConneect = NULL;
	std::map<std::string, double> vars;
};