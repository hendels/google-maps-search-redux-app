import { PureComponent } from 'react';
import { withSnackbar } from 'notistack';

class Snackbars extends PureComponent {
    render(){
        switch(this.props.snackbars[0]){
            case 'ZERO_RESULTS':
                this.props.enqueueSnackbar(
                    `No results for this location.`, 
                    {variant: 'error'}
                );
                break;
            case 'NO_RESULTS_FOUND':
                this.props.enqueueSnackbar(`No results found.`);
                break;
            case 'OVER_QUERY_LIMIT':
                this.props.enqueueSnackbar(
                    `Over Query Limit - try again in a while.`,
                    {variant: 'warning'}
                );
                break;
            default:
                break;
        }
        return null;
    }
}

export default withSnackbar(Snackbars);