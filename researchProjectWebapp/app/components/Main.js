/* Main.js contains the react code to render the Graphical User Interface. */
var React = require('react');
var ReactDOM = require('react-dom');
var ReactWidgets = require('react-widgets');
var numberLocalizer = require('react-widgets/lib/localizers/simple-number');
var LineChart = require('react-chartjs').Line;
var FixedDataTable = require('fixed-data-table');
const {Table, Column, Cell} = FixedDataTable;

// This is for the ReactWidgets
numberLocalizer();

// Main displays everything in the browser window
var Main = React.createClass({
	// This is called automatically before the first render (http://javascript.tutorialhorizon.com/2014/09/13/execution-sequence-of-a-react-components-lifecycle-methods/)
	getInitialState: function() {
		// This is the base structure for the chart data
        var emptyData = {
			labels : [""],
			datasets : [
			{
				data : [0]
			}]
		};
		// initialize all of the datafields this class will need
		return {rawData: [], chartData: emptyData, tableData: [], allDatasetTitles: [],
				allSeriesTitles: []};
	},
	// This is called automatically after the first render
	componentDidMount: function() {
		var that = this; // because you can't use 'this' inside the .get call
		// this links to the routes.py functions
		$.ajax({
			url: '/_datasets', // calls to routes.py
			type: 'get',
			data:{}, // data to send
			success: function(dataset) {
				var data = dataset.data;
				var datasetTitles = [], allTimeSeries = [];
				var i, j;
				for (i=0; i < data.length; i++) { // run through all data
					datasetTitles.push(data[i].title); // add the titles to d
					var curTimeSeries = ["All Time Series"]
					for (j=0; j < data[i].datasets.length; j++) { // run through all datasets
						curTimeSeries.push(data[i].datasets[j].title); // add the dataset titles to curTimeSeries
					}
					allTimeSeries.push(curTimeSeries); // add curTimeSeries to allTimeSeries
				}
				// This mutates the given variables
				that.setState({rawData : data, allDatasetTitles: datasetTitles, allSeriesTitles: allTimeSeries});
			},
			error: function(xhr) {
				console.log("error in distanceChange");
			}
		});
	},
	// creates a single dataseries entry for the chart
	createOneDataSeries: function(series, legend) {
		return {
			"datasets" : [series],
			"labels" : legend
		};
	},
	// updates the chart based on a change in the dataset
	datasetChangeUpdateChart: function(datasetIndex, seriesIndex, threshold) {
		// All series were selected
		if (seriesIndex == 0) {
			// map the given function over all datasets. This creates the data needed for the table for all timeseries
			var tableData = this.state.rawData[datasetIndex].datasets.map(function(dataset, num) {
				return ({
					"id" : num+1, // the index number
					"name" : dataset.title, // the name of the dataset
					"distance" : "--" // the distance isn't applicable yet
				});
			});
			this.setState({chartData: this.state.rawData[datasetIndex], tableData: tableData});
		} else { // single series was selected
			var tableData = [{
					"id" : seriesIndex,
					"name" : this.state.rawData[datasetIndex].datasets[seriesIndex-1].title,
					"distance" : "--"
			}];
			// creates one dataseries entry for the chart
			var one = this.createOneDataSeries(this.state.rawData[datasetIndex].datasets[seriesIndex-1],
			                              		this.state.rawData[datasetIndex].labels);

			this.setState({chartData: one, tableData: tableData});
		}

		// creates a list of the dataset titles for the 'Query' group
		var seriesListForDataset = this.state.rawData[datasetIndex].datasets.map(function(dataset, num) {
				return (dataset.title);
			});
		this.setState({seriesList: seriesListForDataset});

		$.ajax({
			url: '/_datasetChange', // calls to routes.py
			type: 'get',
			data:{datasetIndex:datasetIndex, seriesIndex:seriesIndex, threshold:threshold}, // data to send
			success: function(response) {
				// console.log(response);
			},
			error: function(xhr) {
				console.log("error in distanceChange");
			}
		});
	},
	// Updates the chart based on a change in the 'Query' group's 'Similarity Query' from dataset
	datasetQueryUpdateChart: function(seriesIndex, start, length) {
		var that = this;
		$.ajax({
		  url: '/_datasetQueryUpdate', // calls to routes.py
		  type: 'get',
		  data:{seriesIndex:seriesIndex, start:start, length:length},
		  success: function(response) {
		  	// not enough information to compute the similarity distance
		  	if (response.datasetIndex == -1)
		  		return;

		  	// creates table data based on the result of running ONEX similarity
		    var tableData = [{
				"id" : response.seriesIndex,
				"name" : that.state.rawData[response.datasetIndex].datasets[response.seriesIndex].title,
				"distance" : response.distance
			}];

			var one = that.createOneDataSeries(that.state.rawData[response.datasetIndex].datasets[response.seriesIndex],
											   that.state.rawData[response.datasetIndex].labels);

			that.setState({chartData: one, tableData: tableData})
		  },
		  error: function(xhr) {
		    console.log("error in datasetQueryUpdateChart");
		  }
		});
	},
	// Updates the chart based on a change in the 'Query' group's 'Similarity Query' from file
	// TODO: actually load from file
	fileQueryUpdateChart: function(filename, start, length) {
		$.ajax({
		  url: '/_fileQueryUpdate',
		  type: 'get',
		  data:{filename:filename, start:start, length:length},
		  success: function(response) {
		    // console.log(response);
		  },
		  error: function(xhr) {
		    console.log("error in fileQueryUpdateChart");
		  }
		});
	},
	// Updates the chart based on a change in the 'Query' group's 'Outlier Detection'
	// TODO: Implement this
	outlierUpdateChart: function(start, length) {
		$.ajax({
		  url: '/_outlierUpdate',
		  type: 'get',
		  data:{start:start, length:length},
		  success: function(response) {
		    // console.log(response);
		  },
		  error: function(xhr) {
		    console.log("error in outlierUpdateChart");
		  }
		});
	},
	// Updates route.py when there's a change in the 'Distance' group
	distanceChange: function(distance) {
		$.ajax({
			url: '/_distanceUpdate',
			type: 'get',
			data:{distance:distance},
			success: function(response) {
				// console.log(response);
			},
			error: function(xhr) {
				console.log("error in distanceChange");
			}
		});
	},
	// renders the full GUI window. This function is called automatically.
	render: function() {

		// NOTE: ANY COMMENTS IN THE RETURN HTML MUST BE SURROUNDED BY {}
		return (
		   <div id='fullWidthDiv'>
		   	<div id='title'>Interactive Exploration of Time Series</div>
				<div id='optionsDiv'>
					{/* The 'Dataset' group. Send it the dataset titles, all of the series titles, and the callback function to update the chart */}
					<DatasetGroup seriesTitles={this.state.allSeriesTitles}
								  datasetTitles={this.state.allDatasetTitles}
								  chartChange={this.datasetChangeUpdateChart} />
					{/* The 'Distance' group. Send it the callback function */}
					<DistanceGroup distanceChange={this.distanceChange} />
					{/* The 'Query' group. Send it all of the series titles, and callback functions for query
				 		by series, query with file, and outlier detection */}
					<QueryGroup seriesTitles={this.state.seriesList}
								datasetSubmit={this.datasetQueryUpdateChart}
								fileSubmit={this.fileQueryUpdateChart}
								outlierSubmit={this.outlierUpdateChart} />
				</div>
				<div id='chartDiv'>
					{/* The 'Results' group. Send it chart data and table data to display */}
					<DisplayGroup chartData={this.state.chartData}
						tableData={this.state.tableData} />
				</div>
			</div>
		)
	}
});

// The 'Display' Group.
var DisplayGroup = React.createClass({
	// gets data from the given row in the tableData
	rowGetter: function(rowIndex) {
		return this.props.tableData[rowIndex];
	},
	render: function() {
		// sets options for the chart
		var chartOptions = {datasetFill : false, pointDot: false, legendTemplate: ""};
		return (
			<fieldset id='chartGroup'>
				<div className='legend'>Results</div>
			{/* The line chart. Takes the data and chart options. redraw means it will automatically update */}
				<LineChart id='chart' data={this.props.chartData} options={chartOptions} redraw />
			{/* The table. The sizing numbers were arbitrarily chosen. The dataKeys refer to the structure of the table data */}
				<Table
					headerHeight={40}
				    rowHeight={35}
				    rowGetter={this.rowGetter}
				    rowsCount={this.props.tableData.length}
				    width={500}
				    height={200}>
				    <Column
				      label={<Cell>No.</Cell>}
				      width={55}
				      dataKey={'id'} />
				    <Column
				      label={<Cell>Name</Cell>}
				      width={200}
				      dataKey={'name'}
				      flexGrow={1} />
				    <Column
				      label={<Cell>Distance</Cell>}
				      width={100}
				      dataKey={'distance'} />
				</Table>
			</fieldset>
	  	);
	}
});

// The 'Dataset' group.
var DatasetGroup = React.createClass({
	// this is called once to get the initial state
	getInitialState: function() {
		return {threshold: 0, selectedDataset: 0,
					selectedSeries: '---', series: [], selectedSeriesIndex: 0};
	},
	// This handles a new chosen dataset. It sets the threshold, sets the selectedDataset state, populates the series dropdown, and updates the chart.
	handleNewDataset: function(e) {
		var initialThreshold = 0.2;	// default ST
		this.setState({threshold: initialThreshold}); // update to new dataset's threshold
		var i;
		for (i=0; i < this.props.datasetTitles.length; i++) {
			if (this.props.datasetTitles[i] == e) { // finds the index of the chosen dataset
				// add all of the chosen dataset's series to the dropdown
				// keep track of which dataset is selected
				this.setState({series: this.props.seriesTitles[i], selectedDataset: i,
					selectedSeries: this.props.seriesTitles[i][0]});
				// update the graph. the 0 means all series
				this.props.chartChange(i, 0, initialThreshold);
			}
		}
	},
	// This handles a new chosen series. It sets the selectedSeries state and updates the chart.
	handleNewSeries: function(e) {
		var i;
		for (i=0; i < this.state.series.length; i++) {
			if (this.state.series[i] == e) {
				// update the graph
				this.props.chartChange(this.state.selectedDataset, i, this.state.threshold);
			}
		}

		this.setState({selectedSeries: e, selectedSeriesIndex: i});
	},
	// This handles a new threshold. It sets the threshold and updates the chart
	handleThresholdChange: function(e) {
		this.setState({threshold: e.target.value});
		this.props.chartChange(this.state.selectedDataset, this.state.selectedSeriesIndex, this.state.threshold);
	},
	render: function() {
		// define the dropdownList
	  	var DropdownList = ReactWidgets.DropdownList;

		return (
			<fieldset>
				<div className='legend'>Dataset</div>
				{/* The dataset dropdown. Takes the dataset titles as data and calls handleNewDataset on change */}
				<DropdownList defaultValue='Choose a Dataset' data={this.props.datasetTitles}
					onChange={this.handleNewDataset}/>
				{/* The series dropdown. Takes the seriesTitles as data and calls handleNewSeries on change */}
				<DropdownList value={this.state.selectedSeries} data={this.state.series}
					onChange={this.handleNewSeries}/>
				Similarity Threshold:
				{/* The threshold input box. shows '---' when empty. */}
				<input type="text" placeholder={'     ---'}
					value={this.state.threshold}
					onChange={this.handleThresholdChange} />
			</fieldset>
	);
  }
});

// The 'Distance' group
var DistanceGroup = React.createClass({
	getInitialState: function() {
		var datasets = ['Euclidean', 'Dynamic Time Warping']; // The available distance algorithms
		return {sets: datasets, selected: 'Choose a Similarity Distance'};
	},
	// handles a change in the selected distance. Sets the new distance and calls the callback function
	handleNewDistance: function(dist) {
		this.setState({selected: dist});
		this.props.distanceChange(dist);
	},
	render: function() {
	  	var DropdownList = ReactWidgets.DropdownList;

		return (
				<fieldset>
					<div className='legend'>Distance</div>
					{/* The distance dropdown list */}
					<DropdownList defaultValue={this.state.selected} data={this.state.sets}
						onChange={value => this.handleNewDistance(value)} />
				</fieldset>
		);
	}
});

// The 'Query' group.
var QueryGroup = React.createClass({
	getInitialState: function() {

		return {queryOpts: ['Similarity Query', 'Outlier Detection'],
				showQuery: true, showLoadFromDataset: true,
				loadFromOpts: ['Query from Dataset', 'Query from File'],
				selectedFile: '', start: 0, length: 0,
				selectedDataset: -1};
	},
	// handles a change in chosen query type (similarity or outlier detection). updates what is rendered
	handleNewQueryType: function(e) {
		// user selected outlier detection
		if (e == this.state.queryOpts[0])
			this.setState({showQuery: true, showLoadFromDataset: true});
		else
			this.setState({showQuery: false});
	},
	// handles a change in the similarity query's load from (file or dataset). updates what is rendered
	handleNewLoadFrom: function(e) {
		// user selected from file
		if (e == this.state.loadFromOpts[0])
			this.setState({showLoadFromDataset: true});
		else
			this.setState({showLoadFromDataset: false});
	},
	// verifies that the incoming is a number
	verifyInputNumber: function(e) {
		return (parseFloat(e) == e) || (e == '');
	},
	// handles a change in the start field.
	handleStart: function(e) {
		// if it's a number, update the state
		if (this.verifyInputNumber(e.target.value)) {
			this.setState({start: e.target.value});
		}
	},
	// handles a change in the length field
	handleLength: function(e) {
		// if it's a number, update the state
		if (this.verifyInputNumber(e.target.value)) {
			this.setState({length: e.target.value});
		}
	},
	// handles a change in the chosen dataset. Updates the state with the chosen series index
	handleNewDataset: function(e) {
		var i;
		for (i=0; i < this.props.seriesTitles.length; i++) {
			if (this.props.seriesTitles[i] == e) {
				this.setState({selectedDataset: i});
			}
		}
	},
	// handles choosing a query file from the computer. NOT COMPLETE
	handleFileBrowse: function(e) {
		// TODO: launch browse window
		this.setState({selectedFile: 'testing'});
	},
	// handles verifying data and calling the appropriate callback function
	handleViewResults: function(e) {
		e.preventDefault();	// prevents the webpage from reloading

		if (this.state.showQuery && this.state.showLoadFromDataset) { // similarity query from dataset
			this.props.datasetSubmit(this.state.selectedDataset, this.state.start, this.state.length);
		} else if (this.state.showQuery && (!this.state.showLoadFromDataset)) { // similarity query form file
			this.props.fileSubmit("filename",this.state.start,this.state.length);
		} else { // outlier detection
			this.props.outlierSubmit(this.state.start, this.state.length);
		}

		return false; // prevents the webpage from reloading
	},
	render: function() {
	  	var RadioBtn = ReactWidgets.SelectList;
	  	var DropdownList = ReactWidgets.DropdownList;

		return (
		    <form onSubmit={this.handleViewResults}>
				<fieldset>
					<div className='legend'>Query</div>
					{/* radio buttons: Similarity Query vs. Outlier Detection */}
					<div> <RadioBtn defaultValue={this.state.queryOpts[0]} data={this.state.queryOpts}
						onChange={this.handleNewQueryType}/> </div>
					<div>
					{/* Determines whether to display similarity query or outlier detection */}
					{ this.state.showQuery ?
						<div>
							{/* Similarity Query */}
							{/* radio buttons: Query from Dataset vs. Query from File */}
							<RadioBtn defaultValue={this.state.loadFromOpts[0]} data={this.state.loadFromOpts}
								onChange={this.handleNewLoadFrom}/>
							{/*  Determines whether to display load from dataset or file */}

							{ this.state.showLoadFromDataset ?
								<div>
									{/* Load from dataset */}
									{/* Choose Query from Dataset */}
									<DropdownList defaultValue={'Choose Query from Dataset'}
													  data={this.props.seriesTitles} onChange={this.handleNewDataset} />
								</div>
								:
								<div>
									{/* Load from file. */}
									{/* Choose Query from File. TODO: Launch file browser or something */}
									<input id='full' type='text' value={this.state.selectedFile} placeholder={'Choose Query from File'} />
									{/* Browse button */}
									<button type='submit'>Browse</button>
								</div>
							}
							<div>
								Start:
								{/* Start text input */}
								<input type="text" placeholder={'     ---'} value={this.state.start}
									onChange={value => this.handleStart(value)} />
								&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Length:
								{/* Length text input */}
								<input type="text" placeholder={'     ---'} value={this.state.length}
											onChange={this.handleLength} /> <br />
							</div>
						</div>
						:
						<div>
							{/* Outlier Detection: */}
							Length:
							{/* Length text input */}
							<input type="text" placeholder={'     ---'} value={this.state.length}
										onChange={this.handleLength} /> <br />
						</div>
					}
					</div>
					{/* View Results button */}
					<button>View Results</button>
				</fieldset>
			</form>
		);
	}
});

// This renders the page.
ReactDOM.render(
    <Main />,
    document.getElementById('app')
  );
