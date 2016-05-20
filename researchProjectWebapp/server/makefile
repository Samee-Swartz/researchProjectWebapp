onex = ../../ONEX

all: makeONEX ONEXBindings.so

makeONEX:
	$(MAKE) -C $(onex)

ONEXBindings.so: ONEXBindings.o $(onex)/onex.so
	g++ -shared -std=c++11 -Wall -g -o ONEXBindings.so ONEXBindings.o $(onex)/onex.so -lpython2.7 -lboost_python -lboost_system

ONEXBindings.o: ONEXBindings.cpp
	g++ -std=c++11 -Wall -fPIC -c -g -o ONEXBindings.o ONEXBindings.cpp

clean:
	rm -f ONEXBindings.so ONEXBindings.o
	cd $(onex) && make clean
