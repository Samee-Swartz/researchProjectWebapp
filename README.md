The machine onex.cs.wpi.edu is setup to locally run the webapp in its current state.

USING WINDOWS:
1.	Check if Xming is installed on your machine by searching for it under in the start menu.
	If it's not there, install it by going to www.straightrunning.com/XmingNotes/
Install Xming X Server for Windows

Launch Xming (it won't appear to be running. that's ok)
Launch PuTTY.
Host Name: slswartz@onex.cs.wpi.edu
Port: 22
On the left hand side: Connection > SSH > X11:
select Enable X11 forwarding
X display location: localhost:0

Password: n8H%Rbc%+4

To build the project use:
researchProjectWebapp/server$ make // compiles all cpp code and builds the bindings
researchProjectWebapp$ npm build // compiles the javascript into bundle.js.
researchProjectWebapp$ webpack // compiles the javascript into bundle.js. Use '-w' for continuous development

To deploy the flask server on localhost:5000 use:
researchProjectWebapp/server$ python routes.py

To see errors:
Check the terminal
In your webbrowser open the 'inspect' window and choose console.

Problems:
- Most of the ONEX functions write to standard out instead of returning values. You may need to modify or create new functions to return data for use in the webapp.
- If I'm using the returnSimilar function to compute the similarity between a dataset and a series in it... I'll always get the series as the most similar...
- Grouping the datasets takes a while. (ECG.txt)

Current functionality:
- The datasets from routes.py are loaded into the interface (GUI) and loaded into the ONEX software.
- Any changes to the 'Dataset' group on the GUI are sent to routes.py and shown in the 'Results' group
- When a dataset is selected, the query from dataset dropdown in populated.
- Any changes to the 'Query' group's 'Similarity Query' are sent to routes.py
- In 'Similiarity Query' mode, when 'View Results' is pressed, the ONEX returnSimilar function is called on the chosen Dataset and the chosen Query with the given start and length.

TODO:
- When running similarity query, remove the query series from the dataset, otherwise the distance will always be 0.
- Add functionality to the 'distance' group
- Add functionality to the 'Query from File' and 'Outlier Detection' modes
- Make the resulting query red on the graph





To install you need:

- Flask
- python (add python2.7 to path)
- boost
- web browser
- npm
-- webpack






run the install script
- when it asks about installing something hit yes. The python package will prompt you for a package description, just hit enter.
nano ~/.bashrc
At the very bottom add:
export CPLUS_INCLUDE_PATH=/usr/include/python2.7/
source ~/.bashrc
