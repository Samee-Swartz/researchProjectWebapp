#include "Grouping.h"

#include "trillionDTW.h"

#include <iostream>
#include <fstream>
#include <algorithm>

#include <stdlib.h>

using namespace std;

int verbosity = 0;

TimeSeriesCentroid::TimeSeriesCentroid(int length)
{
    this->count = 0;
    this->length = length;

    sum = vector<seqitem_t>(length, 0.0);

    cachedCentroid = vector<seqitem_t>(length, 0.0);
    cacheValid = true;
}

TimeSeriesCentroid::TimeSeriesCentroid(vector<seqitem_t> &centroid, int count)
{
    this->count = count;
    this->length = centroid.size();

    sum = vector<seqitem_t>(length, 0);

    for (int i = 0; i < length; i++)
        sum[i] = centroid[i] * count;

    cachedCentroid = vector<seqitem_t>(centroid);
    cacheValid = true;
}

int TimeSeriesCentroid::getCount(void)
{
    return count;
}

int TimeSeriesCentroid::getLength(void)
{
    return length;
}

void TimeSeriesCentroid::addVector(const vector<seqitem_t> data)
{
    addArray(data.data());
}

void TimeSeriesCentroid::addArray(const seqitem_t *data)
{
    for (unsigned int i = 0; i < sum.size(); i++)
        sum[i] += data[i];

    count++;
    cacheValid = false;
}

vector<seqitem_t> &TimeSeriesCentroid::getCentroid(void)
{
    if (cacheValid == true) {
        return cachedCentroid;
    }

    for (unsigned int i = 0; i < sum.size(); i++) {
        cachedCentroid[i] = sum[i] / count;
    }

    cacheValid = true;

    return cachedCentroid;
}

TimeSeriesIntervalEnvelope::TimeSeriesIntervalEnvelope(TimeSeriesInterval interval): interval(interval)
{
    /*order_cache_valid = */
    kimfl_cache_valid = keogh_cache_valid = false;
}

void TimeSeriesIntervalEnvelope::setInterval(TimeSeriesInterval interval)
{
    this->interval = interval;
    /*order_cache_valid = */
    kimfl_cache_valid = keogh_cache_valid = false;
}

/*
vector<int> &TimeSeriesIntervalEnvelope::getIndexOrder(void)
{
    if (!order_cache_valid) {
        genIndexOrder();
    }

    return index_order;
}
*/

vector<seqitem_t> &TimeSeriesIntervalEnvelope::getKeoghLower(void)
{
    if (!keogh_cache_valid) {
        genKeoghLU();
    }

    return keogh_lower;
}

vector<seqitem_t> &TimeSeriesIntervalEnvelope::getKeoghUpper(void)
{
    if (!keogh_cache_valid) {
        genKeoghLU();
    }

    return keogh_upper;
}

//void TimeSeriesIntervalEnvelope::genIndexOrder(void) {}
// TODO: Remove, we don't use this.
void TimeSeriesIntervalEnvelope::genKimFL(void)
{
    kimfl_f = interval[0];
    kimfl_l = interval[interval.length() - 1];

    double min = INF;
    double max = -INF;
    for (int i = 0; i < interval.length(); i++) {
        double t = interval[i];
        max = (t > max)? t : max;
        min = (t < min)? t : min;
    }

    kimfl_min = min;
    kimfl_max = max;

    kimfl_cache_valid = true;
}

void TimeSeriesIntervalEnvelope::genKeoghLU(int warps)
{
    keogh_lower.resize(interval.length(), 0);
    keogh_upper.resize(interval.length(), 0);

    // Function provided by trillionDTW codebase. See README.
    lower_upper_lemire(interval.getData(), interval.length(), 0,
                       keogh_lower.data(), keogh_upper.data());

    keogh_cache_valid = true;
}

void TimeSeriesIntervalEnvelope::genCaches(int warps)
{
    // genKimFL(); // Not used.
    genKeoghLU(warps);
}

inline double _min(double a, double b)
{
    return (a < b)? a : b;
}

inline double _dist(double a, double b)
{
    return (b - a) * (b - a);
}

// Methods based on trillionDTW codebase. See README.
seqitem_t TimeSeriesIntervalEnvelope::kimFLDist(TimeSeriesIntervalEnvelope &other, double dropout)
{
    int al = interval.length();
    int bl = other.interval.length();
    int l = _min(al,bl);

    if (l == 0)
        return 0;

    if (l == 1)
        return _dist(interval[0], other.interval[0]);

    double lb = 0;

    lb += _dist(interval[0], other.interval[0]);
    lb += _dist(interval[al-1], other.interval[bl-1]);
    if (lb >= dropout)
        return INF;

    lb += _min(_min(_dist(interval[0], other.interval[1]),
                    _dist(interval[1], other.interval[1])),
               _dist(interval[1], other.interval[0]));

    if (lb >= dropout)
        return INF;

    lb += _min(_min(_dist(interval[al-1], other.interval[bl-2]),
                    _dist(interval[al-2], other.interval[bl-2])),
               _dist(interval[al-2], other.interval[bl-1]));

    if (lb >= dropout)
        return INF;

    if (l == 4)
        return lb;

    lb += _min(_min(_min(_dist(interval[0], other.interval[2]),
                         _dist(interval[1], other.interval[2])),
                    _min(_dist(interval[2], other.interval[2]),
                         _dist(interval[2], other.interval[1]))),
               _dist(interval[2], other.interval[0]));

    if (lb >= dropout)
        return INF;

    lb += _min(_min(_min(_dist(interval[al-1], other.interval[bl-3]),
                         _dist(interval[al-2], other.interval[bl-3])),
                    _min(_dist(interval[al-3], other.interval[bl-3]),
                         _dist(interval[al-3], other.interval[bl-2]))),
               _dist(interval[al-3], other.interval[bl-1]));

    return lb;
}

// Methods based on trillionDTW implementation. See README.
seqitem_t TimeSeriesIntervalEnvelope::keoghDist(TimeSeriesIntervalEnvelope &other, int warps, double dropout)
{
    if (!other.keogh_cache_valid)
        other.genKeoghLU(warps);

    int al = interval.length();
    int bl = other.interval.length();
    int len = _min(al, bl);

    double lb = 0;
    double x, d, l, u;

    for (int i = 0; i < len && lb < dropout; i++)
    {
        x = interval[i];
        l = other.keogh_lower[i];
        u = other.keogh_upper[i];
        d = 0;
        if (x > u)
            d = _dist(x,u);
        else if(x < l)
            d = _dist(x,l);
        lb += d;
    }

    return lb;
}

// Based on trillionDTW methods. See README.
seqitem_t TimeSeriesIntervalEnvelope::crossKeoghDist(TimeSeriesIntervalEnvelope &other, int warps, double dropout)
{
    double lb = keoghDist(other, warps, dropout);

    if (lb >= dropout)
        return INF;
    else
        return std::max(lb, other.keoghDist(*this, warps, dropout));
}

// Based on trillionDTW methods. See README.
seqitem_t TimeSeriesIntervalEnvelope::cascadeDist(TimeSeriesIntervalEnvelope &other, int warps, double dropout)
{
    seqitem_t lb = kimFLDist(other, dropout);
    if (lb >= dropout)
        return INF;

    lb = crossKeoghDist(other, warps, dropout);
    if (lb >= dropout)
        return INF;

    return interval.dist(other.interval, &dtw_lp2_dist, dropout);
}

TimeSeriesGroup::TimeSeriesGroup(TimeSeriesSet *dataset, int length)
    :centroid(length)
{
    this->dataset = dataset;
    this->length = length;
    this->perSeq = dataset->getSeqLength() - length + 1;

    count = 0;
    sumDist = 0.0;
    members = vector<bool>(dataset->getSeqCount()*perSeq, false);

    envelopeCacheValid = false;
}

TimeSeriesGroup::~TimeSeriesGroup(void)
{
}

bool TimeSeriesGroup::isMember(int seq, int start)
{
    return members[seq * perSeq + start];
}

void TimeSeriesGroup::addMember(int seq, int start, bool update)
{
    count++;
    members[seq * perSeq + start] = true;

    if (update) {
        centroid.addArray(dataset->getRawData(seq, start));

        envelopeCacheValid = false;
    }
}

seqitem_t TimeSeriesGroup::distance(vector<seqitem_t> &data, SeriesDistanceMetric *metric, seqitem_t dropout)
{
    vector<seqitem_t> &cent = centroid.getCentroid();
    TimeSeriesInterval a = TimeSeriesInterval((seqitem_t*) data.data(), TimeInterval(0, data.size() - 1));
    TimeSeriesInterval b = TimeSeriesInterval((seqitem_t*) cent.data(), TimeInterval(0, length - 1));

    seqitem_t t = metric->run(a,b,dropout);

    return t;
}

seqitem_t TimeSeriesGroup::distance(int len, seqitem_t *data, SeriesDistanceMetric *metric, seqitem_t dropout)
{
    vector<seqitem_t> &cent = centroid.getCentroid();
    TimeSeriesInterval a = TimeSeriesInterval(data, TimeInterval(0, len - 1));
    TimeSeriesInterval b = TimeSeriesInterval((seqitem_t*) cent.data(), TimeInterval(0, length - 1));

    seqitem_t t = metric->run(a,b,dropout);

    return t;
}

int TimeSeriesGroup::getCount(void)
{
    return count;
}

TimeSeriesIntervalEnvelope &TimeSeriesGroup::getEnvelope(void)
{
    if (!envelopeCacheValid) {
        vector<seqitem_t> &cent = centroid.getCentroid();
        cachedEnvelope.setInterval(TimeSeriesInterval(cent.data(), TimeInterval(0, cent.size() - 1)));
        envelopeCacheValid = true;
    }

    return cachedEnvelope;
}

void TimeSeriesGroup::genEnvelope(void)
{
    getEnvelope().genCaches();
}

seqitem_t TimeSeriesGroup::getSumDist(int mseq, int mstart)
{
    seqitem_t sum = 0.0;

    for (int seq = 0; seq < dataset->getSeqCount(); seq++) {

        for (int start = 0; start < perSeq; start++) {

            if (members[seq * perSeq + start]) {
                if ((seq == mseq) && (start == mstart))
                    continue;

                TimeSeriesInterval a(dataset, seq, TimeInterval(start, start + length - 1));
                TimeSeriesInterval b(dataset, seq, TimeInterval(start, start + length - 1));
                sum += a.dist(b);
            }
        }
    }

    return sum;
}

struct tssumdist {
    seqitem_t sumDist;
    int order;
};

static bool _dists_lt_op(tssumdist a, tssumdist b)
{
    return a.sumDist < b.sumDist;
}

void TimeSeriesGroup::genOrder(void)
{
    vector<tssumdist> dists;

    for (int seq = 0; seq < dataset->getSeqCount(); seq++) {

        for (int start = 0; start < perSeq; start++) {

            if (members[seq * perSeq + start]) {
                dists.push_back((tssumdist) {getSumDist(seq, start), seq*perSeq + start});
            }
        }
    }

    std::sort(dists.begin(), dists.end(), &_dists_lt_op);

    order.clear();

    for (unsigned int i = 0; i < dists.size(); i++)
        order.push_back(dists[i].order);
}

vector<seqitem_t> &TimeSeriesGroup::getCentroid(void)
{
    return centroid.getCentroid();
}

seqitem_t &TimeSeriesGroup::getSumDist(void)
{
    return sumDist;
}

kBest TimeSeriesGroup::getOutlier(void)
{
    for (int seq = 0; seq < dataset->getSeqCount(); seq++) {

        for (int start = 0; start < perSeq; start++) {

            if (members[seq * perSeq + start])
                return kBest(seq, TimeInterval(start, start + length - 1), sumDist);
        }
    }

    return kBest();
}

kBest TimeSeriesGroup::getBestMatch(TimeSeriesIntervalEnvelope query, int warps, double dropout)
{
    if (warps < 0)
        warps = query.interval.length() * 2;

    kBest bsf = kBest();

    kBest curr;

    if (order.size() > 0) {

        cout << "HI" << order.size() << endl;

        for (unsigned int i = 0; i < order.size(); i++) {

            curr.interval.start = order[i] % perSeq;
            curr.seq = order[i] / perSeq;
            TimeSeriesIntervalEnvelope env(dataset->getInterval(curr.seq,TimeInterval(curr.interval.start,
                                                                                      curr.interval.start + length - 1)));
            curr.dist = env.cascadeDist(query, warps, bsf.dist);

            bsf.min(curr);

            if (bsf.dist == 0.0)
                break;
        }

    } else {

        for (int seq = 0; seq < dataset->getSeqCount(); seq++) {

            for (int start = 0; start < perSeq; start++) {

                curr.interval.start = start;
                curr.seq = seq;

                if (!members[seq * perSeq + start]) {
                    curr.dist = INF;
                } else {
                    TimeSeriesIntervalEnvelope env(dataset->getInterval(seq, TimeInterval(start, start + length - 1)));
                    curr.dist = env.cascadeDist(query, warps, bsf.dist);
                }

                bsf.min(curr);

                if (bsf.dist == 0.0)
                    break;
            }

            if (bsf.dist == 0.0)
                break;
        }

    }

    if (bsf.interval.start >= 0)
        bsf.interval.end = bsf.interval.start + length - 1;

    return bsf;
}

void TimeSeriesGroup::toFile(ostream &out)
{
    int seqCount = dataset->getSeqCount();
    out << seqCount << ' ' << perSeq << endl;

    for (int seq = 0; seq < seqCount; seq++) {
        for (int start = 0; start < perSeq; start++)
            out << ((isMember(seq, start))? "1 " : "0 ");

        out << endl;
    }

    out << length << ' ' << centroid.getCount() << endl;
    vector<seqitem_t> cent = getCentroid();
    for (unsigned int i = 0; i < cent.size(); i++)
        out << cent[i] << " ";

    out << endl;
}

void TimeSeriesGroup::fromFile(istream &in)
{
    int seqCount;
    in >> seqCount >> perSeq;

    bool member;
    for (int seq = 0; seq < seqCount; seq++) {
        for (int start = 0; start < perSeq; start++) {
            in >> member;
            if (member)
                addMember(start, seq, false);
        }
    }

    int length, count;
    in >> length >> count;

    vector<seqitem_t> cent(length, 0.0);
    for (unsigned int i = 0; i < cent.size(); i++)
        in >> cent[i];

    this->centroid = TimeSeriesCentroid(cent, count);
}


TimeSeriesGrouping::TimeSeriesGrouping(TimeSeriesSet *dataset, int length)
{
    this->dataset = dataset;
    this->length = length;
    this->perSeq = dataset->getSeqLength() - length + 1;
}

TimeSeriesGrouping::~TimeSeriesGrouping(void)
{
    clearGroups();
}

TimeSeriesGroup *TimeSeriesGrouping::getGroup(int index)
{
    return groups[index];
}

int TimeSeriesGrouping::getCount(void)
{
    return groups.size();
}

void TimeSeriesGrouping::genGroups(seqitem_t ST)
{
    clearGroups();

    for (int start = 0; start < perSeq; start++) { // Would normally loop [seq][start], but compliance.

        for (int seq = 0; seq < dataset->getSeqCount(); seq++) {

            seqitem_t *sequence = dataset->getRawData(seq, start);

            seqitem_t bsf = ST/2 + 0.01;
            int bsfIndex = -1;

            for (unsigned int i = 0; i < groups.size(); i++) {

                seqitem_t dist = groups[i]->distance(length, sequence, &lp2_norm_dist, bsf);

                if (dist < bsf) {
                    bsf = dist;
                    bsfIndex = i;
                }
            }

            if (bsf > ST/2) {
                bsfIndex = groups.size();
                groups.push_back(new TimeSeriesGroup(dataset, length));
            }

            groups[bsfIndex]->addMember(seq, start);
        }
    }
}

void TimeSeriesGrouping::clearGroups(void)
{
    for (unsigned int i = 0; i < groups.size(); i++)
        if (groups[i] != NULL)
            delete groups[i];

    groups.clear();
}

static bool _group_gt_op(TimeSeriesGroup *a, TimeSeriesGroup *b)
{
    return a->getSumDist() < b->getSumDist();
}

void TimeSeriesGrouping::genSumDists(void)
{
    clearSumDists();

    seqitem_t dist, sum;

    for (unsigned int i = 0; i < groups.size(); i++) {

        sum = 0;

        for (unsigned int j = i+1; j < groups.size(); j++) {

            dist = groups[i]->distance(groups[j]->getCentroid(), &lp2_dist);

            sum += dist;
            groups[j]->getSumDist() += dist;
        }

        groups[i]->getSumDist() += sum;
        groups[i]->genOrder();
    }

    std::sort(groups.begin(), groups.end(), &_group_gt_op);
}

void TimeSeriesGrouping::clearSumDists(void)
{
    for (unsigned int i = 0; i < groups.size(); i++) {
        groups[i]->getSumDist() = 0;
    }
}

void TimeSeriesGrouping::genEnvelopes(void)
{
    for (unsigned int i = 0; i < groups.size(); i++)
        groups[i]->genEnvelope();
}

int TimeSeriesGrouping::getOutlierGroup(void)
{
    int bsfIndex = -1;
    seqitem_t bsfDist = -INF;

    for (unsigned int i = 0; i < groups.size(); i++) {

        seqitem_t curr = groups[i]->getSumDist();

        if (groups[i]->getCount() == 1) {
            if (curr > bsfDist || bsfDist == -INF) {
                bsfIndex = i;
                bsfDist = curr;
            }
        }
    }

    return bsfIndex;
}

kBest TimeSeriesGrouping::getOutlier(void)
{
    int group = getOutlierGroup();

    if (group == -1)
        return kBest();

    return groups[group]->getOutlier();
}

int TimeSeriesGrouping::getBestGroup(TimeSeriesIntervalEnvelope query, seqitem_t *dist, int warps, double dropout)
{
    if (warps < 0)
        warps = query.interval.length() * 2;

    seqitem_t bsfDist = dropout;
    int bsfIndex = -1;

    for (unsigned int i = 0; i < groups.size(); i++) {

        seqitem_t dist = groups[i]->getEnvelope().cascadeDist(query, warps, bsfDist);

        if ((dist < bsfDist) || (bsfDist == INF)) {
            bsfDist = dist;
            bsfIndex = i;
        }

        if (bsfDist == 0.0)
            break;
    }

    *dist = bsfDist;

    return bsfIndex;
}

void TimeSeriesGrouping::toFile(ostream &out)
{
    out << length << ' ' << dataset->getSeqCount() << ' ' << perSeq << endl;
    out << groups.size() << endl;
    for (unsigned int i = 0; i < groups.size(); i++)
        groups[i]->toFile(out);
}

void TimeSeriesGrouping::fromFile(istream &in)
{
    groups.clear();
    int seqCount, gcount;
    in >> length >> seqCount >> perSeq;
    in >> gcount;
    for (int i = 0; i < gcount; i++) {
        groups.push_back(new TimeSeriesGroup(dataset, length));
        groups[i]->fromFile(in);
    }
}

int *genOrder(SearchStrategy strat, int top, int bottom, int center)
{
    int *order = (int*) malloc((top - bottom) * sizeof(int));

    int up = top - center;
    int down = center - bottom + 1;

    for (int i = 0; i < top - bottom; i++) {

        switch (strat) {

        case EINTERMIX:

             order[i] = center + (((i&1) == 0)? -((i + 1)/2) : ((i + 1)/2));

             if (order[i] >= top || order[i] < bottom) // Off by one... len may not be odd.
                 order[i] = center + (((i&1) != 0)? -((i + 2)/2) : ((i + 2)/2));
 
            break;

        default:
        case EHIGHER_LOWER:

            if (i < up)
                order[i] = center + i;
            else
                order[i] = center - i + up - 1;

            break;

        case ELOWER_HIGHER:

            if (i < down)
                order[i] = center - i;
            else
                order[i] = center + i - down + 1;

            break;

        case ETOP_BOTTOM:

            order[i] = top - i - 1;

            break;

        case EBOTTOM_TOP:

            order[i] = i + bottom;

            break;
        }
    }

    return order;
}

TimeSeriesSetGrouping::TimeSeriesSetGrouping(TimeSeriesSet *database, seqitem_t ST)
{
    this->dataset = database;
    this->ST = ST;
}

TimeSeriesSetGrouping::~TimeSeriesSetGrouping(void)
{
    reset();
}

void TimeSeriesSetGrouping::reset(void)
{
    for (unsigned int i = 0; i < groups.size(); i++)
        delete groups[i];

    groups.clear();
}

bool TimeSeriesSetGrouping::valid(void)
{
    return groups.size() > 0;
}

TimeSeriesGrouping *TimeSeriesSetGrouping::getGroup(int length)
{
    return groups[length];
}

seqitem_t TimeSeriesSetGrouping::getST(void)
{
    return ST;
}

void TimeSeriesSetGrouping::setST(seqitem_t ST)
{
    this->ST = ST;
}

void TimeSeriesSetGrouping::group(void)
{
    reset();
    groups.resize(dataset->getSeqLength(), NULL);

    int count = 0;

    groups[0] = new TimeSeriesGrouping(dataset, 1);
    for (unsigned int i = 1; i < groups.size(); i++) { // Don't group zero length.

        groups[i] = new TimeSeriesGrouping(dataset, i+1);
        groups[i]->genGroups(ST);
        groups[i]->genSumDists();

        if (verbosity > 0)
            printf("Needed %5d groups for length %5d.\n", groups[i]->getCount(), i+1);
        if (verbosity > 1) {
            printf("[ ");
            for (int j = 0; j < groups[i]->getCount(); j++)
                printf("%3d ", groups[i]->getGroup(j)->getCount());
            printf("]\n");
        }

        count += groups[i]->getCount();
    }

    printf("Needed %d groups in total.\n", count);
}

void TimeSeriesSetGrouping::genSumDists(void)
{
    for (unsigned int i = 1; i < groups.size(); i++)
        groups[i]->genSumDists();
}

void TimeSeriesSetGrouping::genEnvelopes(void)
{
    for (unsigned int i = 1; i < groups.size(); i++)
        groups[i]->genEnvelopes();
}

kBest TimeSeriesSetGrouping::getBestInterval(int len, seqitem_t *data, SearchStrategy strat, int warps)
{

    TimeSeriesIntervalEnvelope qenv(TimeSeriesInterval(data, TimeInterval(0, len - 1)));

    int bottom, top; // Bottom: First to search. Top: last to search + 1
    int center = len - 1;

    if (warps < 0)
        warps = groups.size() * 2;

    bottom = std::max(0, center - warps);
    top = std::min((int)groups.size(), center + warps + 1);

    center = (bottom + top - 1) / 2;

    int count = top - bottom;

    int *order = genOrder(strat, top, bottom, center);


    seqitem_t bsf = INF;
    int bsfGroup = -1;
    int bsfLen = -1;

    for (int i = 0; i < count; i++) {

        if (verbosity > 0)
            printf("[%3d] Checking groups of length %3d. Best: %3d@%2d\n", i, order[i] + 1, bsfGroup, bsfLen);
        seqitem_t dist;
        int g = groups[order[i]]->getBestGroup(qenv, &dist, groups.size()*2, bsf);

        if ((dist < bsf) || (bsf == INF)) {
            bsf = dist;
            bsfGroup = g;
            bsfLen = order[i] + 1;
        }

        if (bsf == 0.0)
            break;
    }

    cout << "Found best group. index@length: distance: "
         << bsfGroup << "@" <<bsfLen << ": " << bsf << endl;

    free(order);

    return groups[bsfLen - 1]->getGroup(bsfGroup)->getBestMatch(qenv, groups.size()*2);
}

int TimeSeriesSetGrouping::fromFile(const char *path)
{
    ifstream in;
    in.open(path);

    if (!in.is_open())
        return -1;

    int seqCount, seqLength;
    in >> seqCount >> seqLength >> ST;

    groups.resize(seqLength);

    for (int len = 0; len < seqLength; len++) {
        groups[len] = new TimeSeriesGrouping(dataset, len+1);
        groups[len]->fromFile(in);
    }

    in.close();

    return 0;
}

int TimeSeriesSetGrouping::toFile(const char *path)
{
    ofstream out;

    out.open(path);
    if (!out.is_open())
        return -1;

    out << dataset->getSeqCount() << ' ' << dataset->getSeqLength() << ' ' << ST << endl;
    for (int len = 0; len < dataset->getSeqLength(); len++) {
        groups[len]->toFile(out);
    }

    out.close();

    return 0;
}
