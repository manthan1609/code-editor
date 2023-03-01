import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from 'react-router-dom';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);

  const handleErrors = (e) => {
    console.log('socket error :', e);
    toast.error('Socket Connection Error! Try Again Later');
    reactNavigator('/');
  };

  const init = () => {
    socketRef.current = initSocket();
    socketRef.current.on('connect_error', (err) => handleErrors(err));
    socketRef.current.on('connect_failed', (err) => handleErrors(err));

    socketRef.current.emit(ACTIONS.JOIN, {
      roomId,
      username: location.state?.username,
    });

    socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
      if (username !== location.state?.username) {
        toast.success(`${username} Joined`);
        console.log(`${username} Joined`);
      }
      setClients(clients);
      socketRef.current.emit(ACTIONS.SYNC_CODE, {
        code: codeRef.current,
        socketId,
      });
    });

    socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
      toast.success(`${username} left`);
      setClients((prev) => {
        return prev.filter((client) => client.socketId !== socketId);
      });
    });
  };

  useEffect(() => {
    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.disconnect(true);
      } else {
        console.log('not found socket.current');
      }
    };
  }, []);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room Id Copied');
    } catch (error) {
      toast.error('Could not Copied');
      console.error(error);
    }
  };

  const leaveRoom = () => {
    reactNavigator('/');
  };

  if (!location.state) {
    return <Navigate to={'/'} />;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logoWrapper">
            <img src="/logo.png" alt="logo" className="logoImage" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client?.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>
      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
          }}
        />
      </div>
    </div>
  );
};

export default EditorPage;
