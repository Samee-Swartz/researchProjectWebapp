var React = require('react');
var ReactDOM = require('react-dom');
var ReactWidgets = require('react-widgets');
var numberLocalizer = require('react-widgets/lib/localizers/simple-number');
var LineChart = require('react-chartjs').Line;
var FixedDataTable = require('fixed-data-table');
const {Table, Column, Cell} = FixedDataTable;

numberLocalizer();

// load in JSON data from file
var data;

var oReq = new XMLHttpRequest();
oReq.onload = reqListener;
oReq.open("get", "data/datasets.json", true);
oReq.send();

function reqListener(e) {
    data = JSON.parse(this.responseText);
    ReactDOM.render(<Main data={data}/>, document.getElementById('app'))
}

var Main = React.createClass({
	getInitialState: function() {
        var emptyData = {
			labels : [""],
			datasets : [
			{
				data : [0]
			}]
		};

		var d = [], ss = [];
		var i, j;
		for (i=0; i < this.props.data.length; i++) {
			d.push(this.props.data[i].title);
			var s = ["All Time Series"]
			for (j=0; j < this.props.data[i].datasets.length; j++) {
				s.push(this.props.data[i].datasets[j].title);
			}
			ss.push(s)
		}

		return {chartData: emptyData, tableData: [], allDatasetTitles: d, allSeriesTitles: ss};
	},
	createOneDataSeries: function(series, legend) {
		return {
			"datasets" : [series],
			"labels" : legend
		};
	},
	datasetChangeUpdateChart: function(datasetIndex, seriesIndex) {
		// All series were selected
		if (seriesIndex == 0) {
			var tableData = this.props.data[datasetIndex].datasets.map(function(dataset, num) {
				return ({
					"id" : num+1,
					"name" : dataset.title,
					"distance" : "--"
				});
			});
			this.setState({chartData: this.props.data[datasetIndex], tableData: tableData});
		} else { // single series was selected
			var tableData = [{
					"id" : seriesIndex,
					"name" : this.props.data[datasetIndex].datasets[seriesIndex-1].title,
					"distance" : "--"
			}];

			var one = this.createOneDataSeries(this.props.data[datasetIndex].datasets[seriesIndex-1],
			                              		this.props.data[datasetIndex].labels);

			this.setState({chartData: one, tableData: tableData});
		}

		var seriesListForDataset = this.props.data[datasetIndex].datasets.map(function(dataset, num) {
				return (dataset.title);
			});
		this.setState({seriesList: seriesListForDataset});
	},
	datasetQueryUpdateChart: function(seriesIndex, start, length, results) {

	},
	fileQueryUpdateChart: function(filename, start, length, results) {

	},
	outlierUpdateChart: function(start, length, results) {

	},
	render: function() {
		return (
		   <div id='fullWidthDiv'>
		   	<div id='title'>Interactive Exploration of Time Series</div>
				<div id='optionsDiv'>
					<DatasetGroup seriesTitles={this.state.allSeriesTitles}
								  datasetTitles={this.state.allDatasetTitles}
								  chartChange={this.datasetChangeUpdateChart} />
					<DistanceGroup />
					<QueryGroup seriesTitles={this.state.seriesList}
								datasetSubmit={this.datasetQueryUpdateChart}
								fileSubmit={this.fileQueryUpdateChart}
								outlierSubmit={this.outlierUpdateChart} />
				</div>
				<div id='chartDiv'>
					<DisplayGroup chartData={this.state.chartData}
						tableData={this.state.tableData} />
				</div>
			</div>
		)
	}
});

var DisplayGroup = React.createClass({
	rowGetter: function(rowIndex) {
		return this.props.tableData[rowIndex];
	},
	render: function() {
		var chartOptions = {datasetFill : false, pointDot: false, legendTemplate: ""};
		return (
			<fieldset id='chartGroup'>
				<div className='legend'>Results</div>
				<LineChart id='chart' data={this.props.chartData} options={chartOptions} redraw />
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

var DatasetGroup = React.createClass({
	// this is called once to get the initial state
	getInitialState: function() {
		return {threshold: '', selectedDataset: 0,
					selectedSeries: '---', series: []};
	},
	handleNewDataset: function(e) {
		this.setState({threshold: 0.2}); // update to new dataset's threshold
		var i;
		for (i=0; i < this.props.datasetTitles.length; i++) {
			if (this.props.datasetTitles[i] == e) {
				// add all of the chosen dataset's series to the dropdown
				// keep track of which dataset is selected
				this.setState({series: this.props.seriesTitles[i], selectedDataset: i,
					selectedSeries: this.props.seriesTitles[i][0]});
				// update the graph. the 0 means all series
				this.props.chartChange(i, 0);
			}
		}
	},
	handleNewSeries: function(e) {
		this.setState({selectedSeries: e});
		var i;
		for (i=0; i < this.state.series.length; i++) {
			if (this.state.series[i] == e) {
				// update the graph
				this.props.chartChange(this.state.selectedDataset, i);
			}
		}
	},
	handleThresholdChange: function(e) {
		this.setState({threshold: e.target.value});
	},
	render: function() {
  	var DropdownList = ReactWidgets.DropdownList;

	return (
		<form className='Group'>
			<fieldset>
				<div className='legend'>Dataset</div>
				<DropdownList defaultValue='Choose a Dataset' data={this.props.datasetTitles}
					onChange={this.handleNewDataset}/>
				<DropdownList value={this.state.selectedSeries} data={this.state.series}
					onChange={this.handleNewSeries}/>
				Similarity Threshold:
				<input type="text" placeholder={'     ---'}
					value={this.state.threshold}
					onChange={this.handleThresholdChange} />
			</fieldset>
		</form>
	);
  }
});


var DistanceGroup = React.createClass({
	getInitialState: function() {
		var datasets = ['Euclidean', 'Dynamic Time Warping'];
		return {sets: datasets, selected: 'Choose a Similarity Distance'};
	},
	handleNewDistance: function(e) {
		this.setState({selected: e});
		// update threshold
		// update the graph
	},
	render: function() {
	  	var DropdownList = ReactWidgets.DropdownList;

		return (
			<form className='Group'>
				<fieldset>
					<div className='legend'>Distance</div>
					<DropdownList defaultValue={this.state.selected} data={this.state.sets}
						onChange={value => this.handleNewDistance(value)} />
				</fieldset>
			</form>
		);
	}
});

var QueryGroup = React.createClass({
	getInitialState: function() {
		var set = ['Query 1', 'Query 2', 'Query 3', 'Query 4'];

		return {queryOpts: ['Similarity Query', 'Outlier Detection'],
				showQuery: true, showLoadFromDataset: true,
				loadFromOpts: ['Query from Dataset', 'Query from File'],
				querySets: set, selectedFile: '', start: 0, length: 0,
				results: 0};
	},
	handleNewQueryType: function(e) {
		// user selected outlier detection
		if (e == this.state.queryOpts[0])
			this.setState({showQuery: true});
		else
			this.setState({showQuery: false});
	},
	handleNewLoadFrom: function(e) {
		// user selected from file
		if (e == this.state.loadFromOpts[0])
			this.setState({showLoadFromDataset: true});
		else
			this.setState({showLoadFromDataset: false});
	},
	verifyInputNumber: function(e) {
		// console.log(e);
		return !isNaN(parseFloat(e)) && isFinite(e);
	},
	handleStart: function(e) {
		console.log(e);
		if (this.verifyInputNumber(e)) {
			this.setState({start: e});
		}
	},
	handleLength: function(e) {
		if (this.verifyInputNumber(e)) {
			this.setState({length: e});
		}
	},
	handleResults: function(e) {
		if (this.verifyInputNumber(e)) {
			this.setState({results: e});
		}
	},
	handleNewDataset: function(e) {
		// this.setState({selectedDataset: e});
	},
	handleFileBrowse: function(e) {
		// launch browse window
		this.setState({selectedFile: 'testing'});
	},
	handleViewResults: function() {
		if (this.state.showQuery && this.state.showLoadFromDataset) {
			this.props.datasetSubmit();
		} else if (this.state.showQuery && (!this.state.showLoadFromDataset)) {
			this.props.fileSubmit();
		} else {
			this.props.outlierSubmit();
		}
	},
	render: function() {
	  	var RadioBtn = ReactWidgets.SelectList;
	  	var DropdownList = ReactWidgets.DropdownList;

		return (
			<form className="queryGroup" onSubmit={this.handleViewResults}>
				<fieldset>
					<div className='legend'>Query</div>
					{/* Similarity Query vs. Outlier Detection */}
					<div> <RadioBtn defaultValue={this.state.queryOpts[0]} data={this.state.queryOpts}
						onChange={this.handleNewQueryType}/> </div>
					<div>
					{ this.state.showQuery ?
						<div>
							{/* Query from Dataset vs. Query from File */}
							<RadioBtn defaultValue={this.state.loadFromOpts[0]} data={this.state.loadFromOpts}
								onChange={this.handleNewLoadFrom}/>

							{ this.state.showLoadFromDataset ?
								<div>
									{/* Choose Query from Dataset */}
									<DropdownList defaultValue={'Choose Query from Dataset'}
													  data={this.props.seriesTitles} onChange={this.handleNewDataset} />
								</div>
								:
								<div>
									{/* Choose Query from File */}
									<form onSubmit={this.handleFileBrowse}>
										<input id='full' type='text' value={this.state.selectedFile} placeholder={'Choose Query from File'} />
										<button type='submit'>Browse</button>
									</form>
								</div>
							}
							<div>
							Start:
							<input type="text" placeholder={'     ---'} value={this.state.start}
								onChange={value => this.handleStart(value)} />
							&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Length:
							<input type="text" placeholder={'     ---'} value={this.state.length}
											onChange={this.handleLength} /> <br />
							Number of Results:
							<input type="text" placeholder={'     ---'} value={this.state.results}
									onChange={this.handleResults} />
							</div>
						</div>
						:
						<div>
						Length:
						<input type="text" placeholder={'     ---'} value={this.state.length}
										onChange={this.handleLength} /> <br />
						</div>
					}
					</div>
				<button>View Results</button>
				</fieldset>
			</form>
		);
	}
});

var SimilarityQuery = React.createClass({
	getInitialState: function() {
		return {locationOpts: ['Query from Dataset', 'Query from File'],
				  sets: [], selectedDataset: 'Choose Query from Dataset',
				  selectedFile: '', showDataset: true, length: '', results: '',
				  selectedOpt: 0};
	},
	componentDidMount: function() {
		var querySets = ['Query 1', 'Query 2', 'Query 3', 'Query 4'];
		this.setState({sets: querySets});
	},
	handleNewOpt: function(e) {
		// user selected from file
		if (e == this.state.locationOpts[0]) {
			this.setState({showDataset: true});
			this.setState({selectedOpt: 0});
		} else {
			this.setState({showDataset: false});
			this.setState({selectedOpt: 1});
		}
	},

	handleNewDataset: function(e) {
		this.setState({selectedDataset: e});
	},
	handleFileBrowse: function(e) {
		// if length > 0 and numResults > 0
		// 		add the choosen dataset to the graph in red.
		// launch browse window
		this.setState({selectedFile: 'testing'});
	},
	handleNewNumber: function(e) {
		// check for number
	},
	render: function() {
	  	var DropdownList = ReactWidgets.DropdownList;
	  	var RadioBtn = ReactWidgets.SelectList;

		return (
        <div>
    		<div>
			<RadioBtn value={this.state.locationOpts[this.state.selectedOpt]} data={this.state.locationOpts}
				onChange={value => this.handleNewOpt(value)}/> </div>
			{ this.state.showDataset ?
				<DropdownList defaultValue={this.state.selectedDataset}
								  data={this.state.sets} onChange={value => this.handleNewDataset(value)} />
				:
				<form onSubmit={handleFileBrowse}>
					<input type='text' value={this.state.selectedFile} placeholder={'Choose Query from File'}/>
					<button>Browse</button>
				</form>
			}
			Length:
			<input type="text" placeholder={'     ---'} value={this.state.length}
							onChange={this.handleNewNumber} /> <br />
		</div>
		);
	}
});
