// ONEXBindings.cpp binds the necessary ONEX functions to python using Boost
#include <boost/python.hpp> // python bindings
#include "../../ONEX/src/OnlineSession.h"
#include "../../ONEX/src/Grouping.h"
#include "../../ONEX/src/TimeSeries.h"
#include <vector>
#include <string>
#include <iostream>
// create a global ONEXSession session
OnlineSession *os = new OnlineSession();
kBest lastComputedSim;

// Loads the incoming series based on its incoming specs.
// returns the index of the first incoming series to fail to load or save
// returns -1 on success
int loadTimeSeries(int index, std::string s, int seqLength, int seqCount, int newlineDrop, double ST) {

	if (os->loadolddb(s.c_str(), seqCount, seqLength, newlineDrop) == -1)
		return index;
	os->initdbgroups(index, ST);
	return -1; // success
}

// computes the similarity between a dataset and a specific timeseries within that dataset.
// This should always find the given timeseries in the dataset so the distance should be 0.
// Because this is bound to python this can't return a kBest struct.
// Instead, a global lastComputedSim is set and getter functions are available.
void computeSimilarFromDataset(int dbIndex, int querySeriesIndex, int start, int length) {
	lastComputedSim = os->getdb(dbIndex)->returnSimilar(os->getdb(dbIndex), querySeriesIndex, TimeInterval(start, start+length));
	std::cout << lastComputedSim.seq << std::endl;
}

void computeSimilarFromFile() {
	// TODO: compute the similarity between a dataset and a query from a file
	// Base this on computeSimilarFromDataset.
	// You'll probably need to load a new set in (follow loadTimeSeries()), then
	// compute GroupableTimeSeriesSet::returnSimilar() in OnlineSession.h
}

void computeOutlier() {
	// TODO: compute the outlier detection
	// Look into: GroupableTimeSeriesSet::outlier() in OnlineSession.h
}

// return the distance from the last computed similarity query
double getSimDist() {
	return lastComputedSim.dist;
}

// return the sequence number from the last computed similarity query
int getSimSeqNum() {
	return lastComputedSim.seq;
}

// return the starting index from the last computed similarity query
int getSimIntervalStart() {
	return lastComputedSim.interval.start;
}

// return the ending index from the last computed similarity query
int getSimIntervalEnd() {
	return lastComputedSim.interval.end;
}

// Binds cpp functions to python headers
// The python package is called ONEXBindings (for importing into python)
BOOST_PYTHON_MODULE(ONEXBindings)
{
    using namespace boost::python;
    def("loadTimeSeries", loadTimeSeries);
    def("computeSimilarFromDataset", computeSimilarFromDataset);
    def("computeSimilarFromFile", computeSimilarFromFile);
    def("computeOutlier", computeOutlier);

    def("getSimDist", getSimDist);
    def("getSimSeqNum", getSimSeqNum);
    def("getSimIntervalStart", getSimIntervalStart);
    def("getSimIntervalEnd", getSimIntervalEnd);

}

// required for makefile
int main() {
	return 1;
}
